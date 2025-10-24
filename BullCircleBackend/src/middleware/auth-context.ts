import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../lib/logger.js';
import type { Role } from './require-role.js';

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

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

export function attachAuthContext(req: Request, res: Response, next: NextFunction) {
  req.envMode = resolveEnvMode(req);

  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    if (isTradingRequest(req)) {
      return res.status(401).json({ error: 'authentication required' });
    }
    return next();
  }

  if (!SUPABASE_JWT_SECRET) {
    logger.error('SUPABASE_JWT_SECRET not configured; rejecting authenticated request');
    return res.status(500).json({ error: 'authentication misconfigured' });
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, SUPABASE_JWT_SECRET) as jwt.JwtPayload & {
      sub?: string;
      email?: string;
    };
    const userId = payload.sub;
    if (!userId) {
      logger.warn('JWT payload missing subject');
      if (isTradingRequest(req)) {
        return res.status(401).json({ error: 'invalid token' });
      }
      return next();
    }

    const roles = extractRoles(payload);
    const auth = {
      userId,
      email: payload.email,
      roles,
      isEmailVerified: extractVerification(payload),
      env: req.envMode,
      raw: payload,
    };
    req.auth = auth;
    req.user = {
      id: userId,
      email: payload.email,
      roles,
    };
  } catch (error) {
    logger.warn({ err: error }, 'Failed to verify JWT token');
    if (isTradingRequest(req)) {
      return res.status(401).json({ error: 'invalid token' });
    }
  }

  next();
}
