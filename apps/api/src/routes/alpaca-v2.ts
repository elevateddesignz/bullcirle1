import { Router } from 'express';
import axios from 'axios';
import { requireRole, requireVerifiedEmail } from '../middleware/require-role.js';
import { alpacaBase, clientFor, refreshTokenIfNeeded, storeNewTokens, type AlpacaEnv } from '../lib/alpaca.js';
import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import jwt from 'jsonwebtoken';

const router = Router();

const AUTHORIZE_URL = 'https://app.alpaca.markets/oauth/authorize';
const TOKEN_URL = 'https://api.alpaca.markets/oauth/token';
const JWT_SECRET = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET;

function ensureEnv(env?: string): AlpacaEnv {
  if (env === 'live') return 'live';
  return 'paper';
}

function createStateToken(payload: { userId: string; env: AlpacaEnv; returnTo?: string }) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is required to sign OAuth state');
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '10m' });
}

function verifyStateToken(token: string) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET not configured');
  }
  return jwt.verify(token, JWT_SECRET) as { userId: string; env: AlpacaEnv; returnTo?: string };
}


router.post('/oauth/start', requireRole(['free', 'paid', 'admin']), requireVerifiedEmail(), async (req, res) => {
  const auth = req.auth;
  if (!auth) {
    return res.status(401).json({ error: 'authentication required' });
  }
  try {
    const env = ensureEnv(req.body?.env || auth.env);
    const cfg = env === 'live'
      ? {
          clientId: process.env.ALPACA_CLIENT_ID_LIVE,
          redirectUri: process.env.ALPACA_REDIRECT_URI_LIVE,
          scope: 'account trading data',
        }
      : {
          clientId: process.env.ALPACA_CLIENT_ID_PAPER,
          redirectUri: process.env.ALPACA_REDIRECT_URI_PAPER,
          scope: 'account trading data',
        };

    if (!cfg.clientId || !cfg.redirectUri) {
      return res.status(500).json({ error: 'Alpaca OAuth not configured' });
    }

    const state = createStateToken({
      userId: auth.userId,
      env,
      returnTo: typeof req.body?.returnTo === 'string' ? req.body.returnTo : undefined,
    });

    const authorizeUrl = new URL(AUTHORIZE_URL);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('client_id', cfg.clientId);
    authorizeUrl.searchParams.set('redirect_uri', cfg.redirectUri);
    authorizeUrl.searchParams.set('scope', cfg.scope);
    authorizeUrl.searchParams.set('state', state);

    res.json({ url: authorizeUrl.toString(), state });
  } catch (error) {
    logger.error({ err: error }, 'Failed to generate Alpaca OAuth URL');
    res.status(500).json({ error: 'Failed to start OAuth flow' });
  }
});

router.get('/connection', requireRole(['free', 'paid', 'admin']), async (req, res) => {
  const auth = req.auth;
  if (!auth) {
    return res.status(401).json({ error: 'authentication required' });
  }
  const env = ensureEnv((req.query.env as string) || auth.env);
  const connection = await prisma.brokerConnection.findFirst({
    where: { userId: auth.userId, provider: 'alpaca', env },
  });
  if (!connection) {
    return res.json({ connected: false, env });
  }
  res.json({
    connected: true,
    env,
    scopes: connection.scopes,
    accountId: connection.accountId,
    expiresAt: connection.expiresAt,
  });
});

router.delete('/connection/:env', requireRole(['free', 'paid', 'admin']), async (req, res) => {
  const auth = req.auth;
  if (!auth) {
    return res.status(401).json({ error: 'authentication required' });
  }
  const env = ensureEnv(req.params.env);
  await prisma.brokerConnection.deleteMany({
    where: { userId: auth.userId, provider: 'alpaca', env },
  });
  res.status(204).send();
});

router.get('/account', requireRole(['free', 'paid', 'admin']), async (req, res) => {
  const auth = req.auth;
  if (!auth) {
    return res.status(401).json({ error: 'authentication required' });
  }
  const env = ensureEnv((req.query.env as string) || auth.env);
  try {
    const data = await refreshTokenIfNeeded(auth.userId, env, async client => {
      const [account, positions, orders] = await Promise.all([
        client.get('/v2/account'),
        client.get('/v2/positions'),
        client.get('/v2/orders', { params: { status: 'all', limit: 50 } }),
      ]);
      return {
        account: account.data,
        positions: positions.data,
        orders: orders.data,
      };
    });
    res.json({ env, ...data });
  } catch (error) {
    logger.error({ err: error, userId: auth.userId, env }, 'Failed to fetch Alpaca account');
    res.status(502).json({ error: 'Failed to fetch Alpaca account' });
  }
});

router.post('/orders', requireRole(['paid', 'admin']), async (req, res) => {
  const auth = req.auth;
  if (!auth) {
    return res.status(401).json({ error: 'authentication required' });
  }
  const env = ensureEnv((req.body?.env as string) || auth.env);
  const orderPayload = req.body?.order;
  if (!orderPayload) {
    return res.status(400).json({ error: 'order payload required' });
  }
  try {
    const result = await refreshTokenIfNeeded(auth.userId, env, client =>
      client.post('/v2/orders', orderPayload)
    );
    res.status(201).json(result.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return res.status(error.response?.status || 500).json({ error: error.response?.data || 'order failed' });
    }
    res.status(500).json({ error: 'order failed' });
  }
});

router.post('/webhook/callback', async (req, res) => {
  // Placeholder for future Alpaca event webhooks (orders, account updates)
  logger.info({ event: req.body?.event }, 'Received Alpaca webhook');
  res.status(202).json({ ok: true });
});

router.get('/callback', async (req, res) => {
  const { state, code } = req.query;
  if (!state || typeof state !== 'string' || !code || typeof code !== 'string') {
    return res.status(400).send('Invalid OAuth callback parameters');
  }

  let payload: { userId: string; env: AlpacaEnv; returnTo?: string };
  try {
    payload = verifyStateToken(state);
  } catch (error) {
    logger.warn({ err: error }, 'Invalid Alpaca OAuth state');
    return res.status(400).send('Invalid state');
  }

  const cfg = payload.env === 'live'
    ? {
        clientId: process.env.ALPACA_CLIENT_ID_LIVE,
        clientSecret: process.env.ALPACA_CLIENT_SECRET_LIVE,
        redirectUri: process.env.ALPACA_REDIRECT_URI_LIVE,
      }
    : {
        clientId: process.env.ALPACA_CLIENT_ID_PAPER,
        clientSecret: process.env.ALPACA_CLIENT_SECRET_PAPER,
        redirectUri: process.env.ALPACA_REDIRECT_URI_PAPER,
      };

  if (!cfg.clientId || !cfg.clientSecret || !cfg.redirectUri) {
    return res.status(500).send('OAuth not configured');
  }

  const payloadBody = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: cfg.clientId,
    client_secret: cfg.clientSecret,
    redirect_uri: cfg.redirectUri,
  });

  try {
    const response = await axios.post(TOKEN_URL, payloadBody, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const { access_token, refresh_token, scope, expires_in } = response.data as {
      access_token: string;
      refresh_token: string;
      scope: string;
      expires_in: number;
    };

    // Fetch account to capture accountId and verify access
    let accountId: string | undefined;
    try {
      const client = axios.create({
        baseURL: alpacaBase(payload.env),
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const accountResponse = await client.get('/v2/account');
      accountId = accountResponse.data?.id;
    } catch (error) {
      logger.warn({ err: error, userId: payload.userId }, 'Failed to fetch account during OAuth callback');
    }

    await storeNewTokens({
      userId: payload.userId,
      env: payload.env,
      accessToken: access_token,
      refreshToken: refresh_token,
      scopes: scope?.split(' ') ?? [],
      expiresIn: expires_in,
      accountId,
    });

    const target = payload.returnTo || 'https://bullcircle.com/dashboard';
    res.send(`<!doctype html><html><body><script>window.opener && window.opener.postMessage({ ok: true, env: '${payload.env}' }, '*'); window.close();</script><p>Connection successful. You can close this window.</p><a href="${target}">Return to BullCircle</a></body></html>`);
  } catch (error) {
    logger.error({ err: error }, 'Failed to exchange Alpaca authorization code');
    res.status(500).send('Failed to exchange authorization code');
  }
});

export default router;
