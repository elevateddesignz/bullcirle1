import crypto from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import {
  buildAuthPayload,
  createSession,
  hashPassword,
  signAccessToken,
  signRefreshToken,
  verifyPassword,
  verifyRefreshToken,
  hashToken,
  rotateSession,
} from '../lib/auth.js';
import { logger } from '../lib/logger.js';
import { requireRole } from '../middleware/require-role.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(2).max(32).optional(),
  displayName: z.string().min(2).max(64).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

function authResponse(user: { id: string; email: string; roles: string[]; displayName?: string | null }, accessToken: string, refreshToken: string) {
  return {
    user: {
      id: user.id,
      email: user.email,
      roles: user.roles,
      displayName: user.displayName ?? null,
    },
    accessToken,
    refreshToken,
  };
}

router.post('/auth/register', async (req, res) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'invalid payload', details: result.error.flatten() });
  }

  const { email, password, username, displayName } = result.data;
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email: email.toLowerCase() },
        ...(username ? [{ username }] : []),
      ],
    },
  });
  if (existing) {
    return res.status(409).json({ error: 'user already exists' });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      username,
      displayName: displayName ?? username ?? email.split('@')[0],
      passwordHash,
      roles: ['free'],
      isEmailVerified: false,
    },
  });

  const accessToken = signAccessToken(buildAuthPayload(user));
  const refreshToken = signRefreshToken({ sub: user.id, sid: crypto.randomUUID() });
  const session = await createSession(user.id, refreshToken, {
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });

  const refreshTokenFinal = signRefreshToken({ sub: user.id, sid: session.id });
  await rotateSession(session.id, refreshTokenFinal);

  return res.json(authResponse(user, accessToken, refreshTokenFinal));
});

router.post('/auth/login', async (req, res) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'invalid payload', details: result.error.flatten() });
  }

  const { email, password } = result.data;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    return res.status(401).json({ error: 'invalid credentials' });
  }

  const isValid = await verifyPassword(user.passwordHash, password);
  if (!isValid) {
    return res.status(401).json({ error: 'invalid credentials' });
  }

  const accessToken = signAccessToken(buildAuthPayload(user));
  const refreshToken = signRefreshToken({ sub: user.id, sid: crypto.randomUUID() });
  const session = await createSession(user.id, refreshToken, {
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });
  const refreshTokenFinal = signRefreshToken({ sub: user.id, sid: session.id });
  await rotateSession(session.id, refreshTokenFinal);

  return res.json(authResponse(user, accessToken, refreshTokenFinal));
});

router.post('/auth/refresh', async (req, res) => {
  const result = refreshSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'invalid payload', details: result.error.flatten() });
  }

  try {
    const payload = verifyRefreshToken(result.data.refreshToken);
    const session = await prisma.authSession.findUnique({ where: { id: payload.sid } });
    if (!session) {
      return res.status(401).json({ error: 'session expired' });
    }
    if (session.refreshTokenHash !== hashToken(result.data.refreshToken)) {
      return res.status(401).json({ error: 'invalid refresh token' });
    }
    if (session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'session expired' });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      return res.status(401).json({ error: 'user not found' });
    }

    const accessToken = signAccessToken(buildAuthPayload(user));
    const refreshToken = signRefreshToken({ sub: user.id, sid: session.id });
    await rotateSession(session.id, refreshToken);

    return res.json(authResponse(user, accessToken, refreshToken));
  } catch (error) {
    logger.warn({ err: error }, 'refresh token failed');
    return res.status(401).json({ error: 'invalid refresh token' });
  }
});

router.post('/auth/logout', async (req, res) => {
  const result = refreshSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'invalid payload', details: result.error.flatten() });
  }
  try {
    const payload = verifyRefreshToken(result.data.refreshToken);
    await prisma.authSession.delete({ where: { id: payload.sid } });
    return res.json({ ok: true });
  } catch (error) {
    return res.status(401).json({ error: 'invalid refresh token' });
  }
});

router.get('/auth/me', requireRole(['free', 'paid', 'admin', 'unverified']), async (req, res) => {
  if (!req.auth) {
    return res.status(401).json({ error: 'authentication required' });
  }

  const user = await prisma.user.findUnique({ where: { id: req.auth.userId } });
  if (!user) {
    return res.status(404).json({ error: 'user not found' });
  }

  return res.json({
    id: user.id,
    email: user.email,
    roles: user.roles,
    displayName: user.displayName,
    username: user.username,
  });
});

export default router;
