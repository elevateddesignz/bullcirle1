import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import { prisma } from './prisma.js';
import type { UserRole } from '@prisma/client';

const ACCESS_TTL = process.env.AUTH_ACCESS_TTL ?? '15m';
const REFRESH_TTL = process.env.AUTH_REFRESH_TTL ?? '30d';
const AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET ?? '';
const AUTH_REFRESH_SECRET = process.env.AUTH_REFRESH_SECRET ?? '';
const AUTH_ISSUER = process.env.AUTH_ISSUER ?? 'bullcircle-api';
const AUTH_AUDIENCE = process.env.AUTH_AUDIENCE ?? 'bullcircle-web';

if (!AUTH_JWT_SECRET || !AUTH_REFRESH_SECRET) {
  console.warn('AUTH_JWT_SECRET or AUTH_REFRESH_SECRET missing');
}

export type AuthPayload = {
  sub: string;
  email: string;
  roles: UserRole[];
  displayName?: string | null;
  isEmailVerified?: boolean;
  typ: 'access';
};

export type RefreshPayload = {
  sub: string;
  sid: string;
  typ: 'refresh';
};

export async function hashPassword(password: string) {
  return argon2.hash(password);
}

export async function verifyPassword(hash: string, password: string) {
  return argon2.verify(hash, password);
}

export function signAccessToken(payload: Omit<AuthPayload, 'typ'>) {
  return jwt.sign({ ...payload, typ: 'access' }, AUTH_JWT_SECRET, {
    expiresIn: ACCESS_TTL,
    issuer: AUTH_ISSUER,
    audience: AUTH_AUDIENCE,
  });
}

export function signRefreshToken(payload: Omit<RefreshPayload, 'typ'>) {
  return jwt.sign({ ...payload, typ: 'refresh' }, AUTH_REFRESH_SECRET, {
    expiresIn: REFRESH_TTL,
    issuer: AUTH_ISSUER,
    audience: AUTH_AUDIENCE,
  });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, AUTH_JWT_SECRET, {
    issuer: AUTH_ISSUER,
    audience: AUTH_AUDIENCE,
  }) as AuthPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, AUTH_REFRESH_SECRET, {
    issuer: AUTH_ISSUER,
    audience: AUTH_AUDIENCE,
  }) as RefreshPayload;
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string, refreshToken: string, meta?: { userAgent?: string; ipAddress?: string }) {
  const expiresAt = new Date(Date.now() + parseTtlMs(REFRESH_TTL));
  return prisma.authSession.create({
    data: {
      userId,
      refreshTokenHash: hashToken(refreshToken),
      userAgent: meta?.userAgent,
      ipAddress: meta?.ipAddress,
      expiresAt,
    },
  });
}

export async function rotateSession(sessionId: string, refreshToken: string) {
  const expiresAt = new Date(Date.now() + parseTtlMs(REFRESH_TTL));
  return prisma.authSession.update({
    where: { id: sessionId },
    data: {
      refreshTokenHash: hashToken(refreshToken),
      expiresAt,
      lastUsedAt: new Date(),
    },
  });
}

export function buildAuthPayload(user: { id: string; email: string; roles: UserRole[]; displayName?: string | null; isEmailVerified?: boolean }) {
  return {
    sub: user.id,
    email: user.email,
    roles: user.roles,
    displayName: user.displayName,
    isEmailVerified: user.isEmailVerified ?? false,
  };
}

function parseTtlMs(value: string) {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) return 30 * 24 * 60 * 60 * 1000;
  const amount = Number(match[1]);
  const unit = match[2];
  const map: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return amount * (map[unit] ?? 1000);
}
