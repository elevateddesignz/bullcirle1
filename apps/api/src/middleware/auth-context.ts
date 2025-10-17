import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../lib/logger.js';
import type { Role } from './require-role.js';

const JWT_SECRET = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET;

type MaybeArray<T> = T | T[] | undefined;

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

function extractEnvMode(req: Request): 'paper' | 'live' | undefined {
  const header = req.headers['x-env-mode'];
  if (header === 'paper' || header === 'live') return header;
  const query = req.query.env;
  if (query === 'paper' || query === 'live') return query;
  return undefined;
}

export function attachAuthContext(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next();
  }

  const token = header.slice(7);
  if (!JWT_SECRET) {
    logger.warn('JWT secret not configured; skipping auth verification');
    return next();
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const roles = extractRoles(payload);
    const auth = {
      userId: (payload as any).sub as string,
      email: (payload as any).email as string | undefined,
      roles,
      isEmailVerified: extractVerification(payload),
      env: extractEnvMode(req),
      raw: payload,
    };
    req.auth = auth;
  } catch (error) {
    logger.warn({ err: error }, 'Failed to verify JWT token');
  }
  next();
}
