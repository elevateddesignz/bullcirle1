import { Router, type Request } from 'express';
import axios from 'axios';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { requireRole, requireVerifiedEmail } from '../middleware/require-role.js';
import { createPerUserRateLimiter } from '../middleware/rate-limit.js';
import { logger } from '../lib/logger.js';
import { alpacaBase, storeNewTokens, type AlpacaEnv } from '../lib/alpaca.js';
import { getEncryptionKey } from '../lib/crypto.js';

const AUTHORIZE_URL = 'https://app.alpaca.markets/oauth/authorize';
const TOKEN_URL = 'https://api.alpaca.markets/oauth/token';
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const oauthConfig = {
  paper: {
    clientId: process.env.ALPACA_PAPER_CLIENT_ID,
    clientSecret: process.env.ALPACA_PAPER_CLIENT_SECRET,
    redirectUri: process.env.ALPACA_PAPER_REDIRECT_URI,
  },
  live: {
    clientId: process.env.ALPACA_LIVE_CLIENT_ID,
    clientSecret: process.env.ALPACA_LIVE_CLIENT_SECRET,
    redirectUri: process.env.ALPACA_LIVE_REDIRECT_URI,
  },
} satisfies Record<AlpacaEnv, { clientId?: string | undefined; clientSecret?: string | undefined; redirectUri?: string | undefined }>;

type StatePayload = {
  userId: string;
  mode: AlpacaEnv;
  nonce: string;
  issuedAt: number;
  returnTo?: string;
};

const startLimiter = createPerUserRateLimiter({
  limit: 5,
  windowMs: 60 * 1000,
});

const callbackLimiter = createPerUserRateLimiter({
  limit: 20,
  windowMs: 60 * 1000,
  keyGenerator: req => `oauth:${req.ip}`,
});

const router = Router();

function parseMode(raw: unknown): AlpacaEnv | undefined {
  if (typeof raw !== 'string') return undefined;
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'paper' || normalized === 'live') {
    return normalized;
  }
  return undefined;
}

function getConfig(mode: AlpacaEnv) {
  const cfg = oauthConfig[mode];
  if (!cfg.clientId || !cfg.clientSecret || !cfg.redirectUri) {
    throw new Error(`Missing Alpaca OAuth configuration for ${mode} mode`);
  }
  return cfg as { clientId: string; clientSecret: string; redirectUri: string };
}

function buildState(payload: StatePayload): string {
  const key = getEncryptionKey();
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', key).update(body).digest('base64url');
  return `${body}.${signature}`;
}

function parseState(token: string): StatePayload {
  const key = getEncryptionKey();
  const parts = token.split('.');
  if (parts.length !== 2) {
    throw new Error('invalid_state_format');
  }
  const [body, signature] = parts;
  const expected = createHmac('sha256', key).update(body).digest();
  const actual = Buffer.from(signature, 'base64url');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new Error('invalid_state_signature');
  }
  const decoded = Buffer.from(body, 'base64url').toString('utf8');
  const payload = JSON.parse(decoded) as Partial<StatePayload>;
  if (!payload.userId || typeof payload.userId !== 'string') {
    throw new Error('invalid_state_payload');
  }
  if (payload.mode !== 'paper' && payload.mode !== 'live') {
    throw new Error('invalid_state_payload');
  }
  if (typeof payload.issuedAt !== 'number') {
    throw new Error('invalid_state_payload');
  }
  if (Date.now() - payload.issuedAt > STATE_TTL_MS) {
    throw new Error('state_expired');
  }
  return payload as StatePayload;
}

function sanitizeReturnTo(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const value = raw.trim();
  if (!value) return undefined;
  if (value.startsWith('/')) {
    return value;
  }
  try {
    const url = new URL(value);
    const allowedOrigins = (process.env.CORS_ORIGIN ?? '')
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean);
    const origin = `${url.protocol}//${url.host}`;
    if (allowedOrigins.includes(origin)) {
      return url.toString();
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function resolveRedirect(mode: AlpacaEnv, returnTo?: string): string {
  const allowedOrigins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
  const base = allowedOrigins[0] ?? 'https://app.bullcircle.com';
  if (returnTo) {
    if (returnTo.startsWith('http://') || returnTo.startsWith('https://')) {
      return returnTo;
    }
    return new URL(returnTo, base).toString();
  }
  return new URL(`/settings/broker?connected=alpaca&mode=${mode}`, base).toString();
}

router.get(
  '/v2/alpaca/oauth/start',
  requireRole(['free', 'paid', 'admin']),
  requireVerifiedEmail(),
  startLimiter,
  (req, res) => {
    const auth = req.auth;
    if (!auth?.userId) {
      return res.status(401).json({ error: 'authentication required' });
    }

    const mode = parseMode(req.query.mode);
    if (!mode) {
      return res.status(400).json({ error: 'invalid_mode' });
    }

    let cfg;
    try {
      cfg = getConfig(mode);
    } catch (error) {
      logger.error({ err: error, mode }, 'Alpaca OAuth misconfigured');
      return res.status(500).json({ error: 'alpaca_oauth_not_configured' });
    }

    const returnTo = sanitizeReturnTo(req.query.return_to ?? req.query.returnTo);
    const payload: StatePayload = {
      userId: auth.userId,
      mode,
      nonce: randomBytes(16).toString('hex'),
      issuedAt: Date.now(),
      ...(returnTo ? { returnTo } : {}),
    };

    let state: string;
    try {
      state = buildState(payload);
    } catch (error) {
      logger.error({ err: error }, 'Failed to sign Alpaca OAuth state');
      return res.status(500).json({ error: 'oauth_state_sign_failed' });
    }

    const authorizeUrl = new URL(AUTHORIZE_URL);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('client_id', cfg.clientId);
    authorizeUrl.searchParams.set('redirect_uri', cfg.redirectUri);
    authorizeUrl.searchParams.set('scope', 'account trading data');
    authorizeUrl.searchParams.set('state', state);

    logger.info({ userId: auth.userId, mode }, 'Redirecting to Alpaca OAuth authorize');
    res.redirect(302, authorizeUrl.toString());
  }
);

router.get('/v2/alpaca/oauth/callback', callbackLimiter, async (req: Request, res) => {
  const { state, code } = req.query;
  if (typeof state !== 'string' || typeof code !== 'string') {
    return res.status(400).json({ error: 'invalid_callback_params' });
  }

  let payload: StatePayload;
  try {
    payload = parseState(state);
  } catch (error) {
    logger.warn({ err: error }, 'Invalid Alpaca OAuth state received');
    const message = error instanceof Error ? error.message : 'invalid_state';
    const status = message === 'state_expired' ? 410 : 400;
    return res.status(status).json({ error: message });
  }

  if (req.auth?.userId && req.auth.userId !== payload.userId) {
    return res.status(403).json({ error: 'state_user_mismatch' });
  }

  const cfg = getConfig(payload.mode);

  const tokenBody = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    redirect_uri: cfg.redirectUri,
  });

  try {
    const tokenResponse = await axios.post(TOKEN_URL, tokenBody, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const {
      access_token: accessToken,
      refresh_token: refreshToken,
      scope,
      expires_in: expiresIn,
      account_id: accountIdFromToken,
    } = tokenResponse.data as {
      access_token: string;
      refresh_token?: string;
      scope?: string;
      expires_in: number | string;
      account_id?: string;
    };

    if (!accessToken || !refreshToken) {
      logger.error('Alpaca token response missing credentials');
      return res.status(502).json({ error: 'oauth_exchange_failed' });
    }

    const expiresInNumber = typeof expiresIn === 'number' ? expiresIn : Number(expiresIn);
    if (!Number.isFinite(expiresInNumber)) {
      return res.status(502).json({ error: 'invalid_token_expiry' });
    }

    let accountId = accountIdFromToken;
    if (!accountId) {
      try {
        const client = axios.create({
          baseURL: alpacaBase(payload.mode),
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const accountResponse = await client.get('/v2/account');
        accountId = accountResponse.data?.id;
      } catch (error) {
        logger.warn({ err: error, userId: payload.userId, mode: payload.mode }, 'Failed to fetch account id after OAuth exchange');
      }
    }

    await storeNewTokens({
      userId: payload.userId,
      env: payload.mode,
      accessToken,
      refreshToken,
      scopes: scope ? scope.split(' ').filter(Boolean) : [],
      expiresIn: expiresInNumber,
      accountId,
    });

    (req as any).user = { id: payload.userId };

    const redirectTarget = resolveRedirect(payload.mode, payload.returnTo);
    logger.info({ userId: payload.userId, mode: payload.mode }, 'Alpaca OAuth connection stored');
    return res.redirect(302, redirectTarget);
  } catch (error) {
    logger.error({ err: error }, 'Failed to exchange Alpaca authorization code');
    return res.status(502).json({ error: 'oauth_exchange_failed' });
  }
});

export const alpacaOAuthRouter = router;
export default router;
