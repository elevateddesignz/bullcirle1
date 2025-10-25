import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../lib/logger.js';
import type { Role } from './require-role.js';

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const HEADER_SUPABASE_URL = 'x-supabase-url';
const HEADER_SUPABASE_KEY = 'x-supabase-key';

type MaybeArray<T> = T | T[] | undefined;

const TRADING_PREFIXES = ['/api/v2/alpaca', '/api/alpaca', '/api/tradingbot', '/api/autopilot'];

declare global {
  namespace Express {
    interface Request {
      envMode: 'paper' | 'live';
    }
  }
}

function normalizeRoles(raw: MaybeArray<string>): Role[] {
  if (!raw) return ['free'];
  const list = Array.isArray(raw) ? raw : [raw];
  const roles = list
    .map(r => r?.toLowerCase())
    .filter((r): r is Role => r === 'admin' || r === 'paid' || r === 'free' || r === 'unverified');
  return roles.length ? roles : ['free'];
}

function extractRoles(payload: any): Role[] {
  if (!payload) return ['free'];
  if (payload.roles) return normalizeRoles(payload.roles);
  if (payload.app_metadata?.roles) return normalizeRoles(payload.app_metadata.roles);
  if (payload['https://bullcircle.com/roles']) return normalizeRoles(payload['https://bullcircle.com/roles']);
  if (payload.role) return normalizeRoles(payload.role);
  return ['free'];
}

function extractVerification(payload: any): boolean {
  if (!payload) return false;
  if (typeof payload.email_confirmed === 'boolean') return payload.email_confirmed;
  if (typeof payload.email_verified === 'boolean') return payload.email_verified;
  if (typeof payload.user_metadata?.email_verified === 'boolean') return payload.user_metadata.email_verified;
  if (typeof payload.app_metadata?.email_verified === 'boolean') return payload.app_metadata.email_verified;
  return false;
}

function resolveEnvMode(req: Request): 'paper' | 'live' {
  const header = req.headers['x-env-mode'];
  const value = Array.isArray(header) ? header[0] : header;
  if (value === 'live') {
    return 'live';
  }
  return 'paper';
}

function isTradingRequest(req: Request): boolean {
  const url = req.originalUrl || req.url || '';
  return TRADING_PREFIXES.some(prefix => url.startsWith(prefix));
}

function firstHeaderValue(value: MaybeArray<string>): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function resolveSupabaseConfig(req: Request) {
  const headerUrl = firstHeaderValue(req.headers[HEADER_SUPABASE_URL] as MaybeArray<string>);
  const headerKey = firstHeaderValue(req.headers[HEADER_SUPABASE_KEY] as MaybeArray<string>);
  return {
    url: headerUrl ?? SUPABASE_URL,
    anonKey: headerKey ?? SUPABASE_ANON_KEY,
  };
}

async function fetchSupabaseUser(token: string, config: { url?: string | null; anonKey?: string | null }) {
  if (!config.url || !config.anonKey) {
    return null;
  }

  try {
    const target = new URL('/auth/v1/user', config.url);
    const response = await fetch(target, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: config.anonKey,
      },
    });

    if (!response.ok) {
      logger.warn({ status: response.status }, 'Supabase user lookup failed');
      return null;
    }

    const body = await response.json();
    if (body?.user) {
      return body.user;
    }
    return body;
  } catch (error) {
    logger.error({ err: error }, 'Supabase remote verification failed');
    return null;
  }
}

function extractUserId(payload: any): string | undefined {
  return payload?.sub ?? payload?.id ?? payload?.user?.id;
}

function extractEmail(payload: any): string | undefined {
  return payload?.email ?? payload?.user?.email;
}

export async function attachAuthContext(req: Request, res: Response, next: NextFunction) {
  req.envMode = resolveEnvMode(req);

  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      if (isTradingRequest(req)) {
        return res.status(401).json({ error: 'authentication required' });
      }
      return next();
    }

    const token = header.slice(7);

    let payload: any | null = null;

    if (SUPABASE_JWT_SECRET) {
      try {
        payload = jwt.verify(token, SUPABASE_JWT_SECRET);
      } catch (error) {
        logger.warn({ err: error }, 'Failed to verify JWT token locally');
      }
    } else {
      logger.warn('SUPABASE_JWT_SECRET not configured; falling back to Supabase introspection');
    }

    const supabaseConfig = resolveSupabaseConfig(req);

    if (!payload) {
      payload = await fetchSupabaseUser(token, supabaseConfig);
    }

    const userId = extractUserId(payload);
    if (!userId) {
      if (isTradingRequest(req)) {
        return res.status(401).json({ error: 'invalid token' });
      }
      return next();
    }

    const roles = extractRoles(payload);
    const email = extractEmail(payload);
    const auth = {
      userId,
      email,
      roles,
      isEmailVerified: extractVerification(payload),
      env: req.envMode,
      raw: payload,
    };
    req.auth = auth;
    req.user = {
      id: userId,
      email,
      roles,
    };

    return next();
  } catch (error) {
    logger.error({ err: error }, 'attachAuthContext failed');
    return next(error);
  }
}
