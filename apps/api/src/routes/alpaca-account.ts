import { Router, type Request } from 'express';
import axios from 'axios';
import { requireRole } from '../middleware/require-role.js';
import { logger } from '../lib/logger.js';
import type { AlpacaEnv } from '../lib/alpaca.js';
import {
  getAccount,
  getPositions,
  listOrders,
  getPortfolioHistory,
} from '../services/trading.js';

const router = Router();

interface RequestWithContext extends Request {
  auth?: {
    userId?: string;
    env?: string;
  };
  envMode?: string;
}

function coerceEnv(value: unknown): AlpacaEnv | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'live' || normalized === 'paper') {
    return normalized;
  }
  return undefined;
}

function resolveEnv(req: RequestWithContext): AlpacaEnv {
  return (
    coerceEnv(req.headers['x-env-mode']) ??
    coerceEnv((req.params as Record<string, unknown>)?.env) ??
    coerceEnv((req.query.env as string) ?? (req.query.mode as string)) ??
    coerceEnv(req.envMode) ??
    coerceEnv(req.auth?.env) ??
    'paper'
  );
}

function applyEnv(req: RequestWithContext, env: AlpacaEnv) {
  req.envMode = env;
}

function ensureAuthenticated(req: RequestWithContext) {
  if (!req.auth?.userId) {
    const error = new Error('authentication required');
    (error as any).status = 401;
    throw error;
  }
}

function resolveStatus(error: unknown, fallback = 500) {
  const status = (error as any)?.status;
  if (typeof status === 'number' && status >= 100 && status < 600) {
    return status;
  }
  if (axios.isAxiosError(error) && error.response?.status) {
    return error.response.status;
  }
  return fallback;
}

function sendError(res: any, error: unknown, fallback: string, fallbackStatus = 500) {
  const status = resolveStatus(error, fallbackStatus);
  if (axios.isAxiosError(error) && error.response?.data) {
    return res.status(status).json(error.response.data);
  }
  if (status >= 400 && status < 500 && error instanceof Error && error.message) {
    return res.status(status).json({ error: error.message });
  }
  return res.status(status).json({ error: fallback });
}

router.get('/account', requireRole(['free', 'paid', 'admin']), async (req, res) => {
  try {
    ensureAuthenticated(req as RequestWithContext);
  } catch (error) {
    return sendError(res, error, 'authentication required', 401);
  }

  const auth = (req as RequestWithContext).auth!;
  const env = resolveEnv(req as RequestWithContext);
  applyEnv(req as RequestWithContext, env);

  try {
    const [account, positions, orders] = await Promise.all([
      getAccount(req),
      getPositions(req),
      listOrders(req, { status: 'all', limit: 50 }),
    ]);
    res.json({ env, account, positions, orders });
  } catch (error) {
    logger.error({ err: error, userId: auth.userId, env }, 'Failed to fetch Alpaca account summary');
    sendError(res, error, 'Failed to fetch Alpaca account', 502);
  }
});

router.get('/account/history', requireRole(['free', 'paid', 'admin']), async (req, res) => {
  try {
    ensureAuthenticated(req as RequestWithContext);
  } catch (error) {
    return sendError(res, error, 'authentication required', 401);
  }

  const auth = (req as RequestWithContext).auth!;
  const env = resolveEnv(req as RequestWithContext);
  applyEnv(req as RequestWithContext, env);

  try {
    const history = await getPortfolioHistory(req, { period: '1M', timeframe: '1D' });
    const items = Array.isArray(history?.timestamp)
      ? history.timestamp.map((timestamp: number, index: number) => ({
          date: new Date(timestamp * 1000).toISOString().slice(0, 10),
          equity: Array.isArray(history?.equity) ? history.equity[index] : undefined,
        }))
      : [];
    res.json({ env, history: items });
  } catch (error) {
    logger.error({ err: error, userId: auth.userId, env }, 'Failed to fetch Alpaca account history');
    sendError(res, error, 'Failed to fetch history', 502);
  }
});

export default router;
