import type { NextFunction, Request, Response } from 'express';
import { logger } from '../lib/logger.js';
import type { Role } from './require-role.js';
import { verifyAccessToken } from '../lib/auth.js';

const TRADING_PREFIXES = ['/api/v2/alpaca', '/api/alpaca', '/api/tradingbot', '/api/autopilot'];

declare global {
  namespace Express {
    interface Request {
      envMode: 'paper' | 'live';
    }
  }
}

type MaybeArray<T> = T | T[] | undefined;

function normalizeRoles(raw: MaybeArray<string>): Role[] {
  if (!raw) return ['free'];
  const list = Array.isArray(raw) ? raw : [raw];
  const roles = list
    .map(r => r?.toLowerCase())
    .filter((r): r is Role => r === 'admin' || r === 'paid' || r === 'free' || r === 'unverified');
  return roles.length ? roles : ['free'];
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

    let payload: any;
    try {
      payload = verifyAccessToken(token);
    } catch (error) {
      logger.warn({ err: error }, 'Failed to verify access token');
      if (isTradingRequest(req)) {
        return res.status(401).json({ error: 'invalid token' });
      }
      return next();
    }

    const roles = normalizeRoles(payload.roles);
    const auth = {
      userId: payload.sub,
      email: payload.email,
      roles,
      isEmailVerified: payload.isEmailVerified ?? false,
      env: req.envMode,
      raw: payload,
    };
    req.auth = auth;
    req.user = {
      id: payload.sub,
      email: payload.email,
      roles,
    };

    return next();
  } catch (error) {
    logger.error({ err: error }, 'attachAuthContext failed');
    return next(error);
  }
}
