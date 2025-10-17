import type { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';

export type Role = 'admin' | 'paid' | 'free' | 'unverified';

export interface AuthContext {
  userId: string;
  email?: string;
  roles: Role[];
  isEmailVerified?: boolean;
  env?: 'paper' | 'live';
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

const roleHierarchy: Record<Role, number> = {
  admin: 3,
  paid: 2,
  free: 1,
  unverified: 0
};

export function requireRole(required: Role | Role[]) {
  const requiredRoles = Array.isArray(required) ? required : [required];
  const minRank = Math.min(...requiredRoles.map(r => roleHierarchy[r] ?? -1));

  return (req: Request, res: Response, next: NextFunction) => {
    const auth = req.auth;
    if (!auth) {
      return res.status(401).json({ error: 'authentication required' });
    }
    const userRank = Math.max(...auth.roles.map(r => roleHierarchy[r] ?? -1));
    if (userRank < minRank) {
      logger.warn({ userId: auth.userId, requiredRoles }, 'role guard blocked request');
      return res.status(403).json({ error: 'insufficient role' });
    }
    next();
  };
}

export function requireVerifiedEmail() {
  return (req: Request, res: Response, next: NextFunction) => {
    const auth = req.auth;
    if (!auth) {
      return res.status(401).json({ error: 'authentication required' });
    }
    if (!auth.isEmailVerified) {
      logger.warn({ userId: auth.userId }, 'email verification required');
      return res.status(403).json({ error: 'email verification required' });
    }
    next();
  };
}
