import { Router } from 'express';
import { requireRole } from '../middleware/require-role.js';
import { refreshTokenIfNeeded, type AlpacaEnv } from '../lib/alpaca.js';
import { logger } from '../lib/logger.js';

const router = Router();

function resolveEnv(req: any): AlpacaEnv {
  const queryEnv = req.query.env;
  if (queryEnv === 'live' || queryEnv === 'paper') return queryEnv;
  return req.auth?.env === 'live' ? 'live' : 'paper';
}

router.get('/account', requireRole(['free', 'paid', 'admin']), async (req, res) => {
  const auth = req.auth;
  if (!auth) {
    return res.status(401).json({ error: 'authentication required' });
  }
  const env = resolveEnv(req);
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
    logger.error({ err: error, userId: auth.userId }, 'Failed to fetch account');
    res.status(502).json({ error: 'Failed to fetch Alpaca account' });
  }
});

router.get('/account/history', requireRole(['free', 'paid', 'admin']), async (req, res) => {
  const auth = req.auth;
  if (!auth) {
    return res.status(401).json({ error: 'authentication required' });
  }
  const env = resolveEnv(req);
  try {
    const result = await refreshTokenIfNeeded(auth.userId, env, client =>
      client.get('/v2/account/portfolio/history', { params: { period: '1M', timeframe: '1D' } })
    );
    const history = result.data;
    res.json({
      env,
      history: history.timestamp?.map((timestamp: number, index: number) => ({
        date: new Date(timestamp * 1000).toISOString().slice(0, 10),
        equity: history.equity?.[index],
      })) ?? [],
    });
  } catch (error) {
    logger.error({ err: error, userId: auth.userId }, 'Failed to fetch account history');
    res.status(502).json({ error: 'Failed to fetch history' });
  }
});

export default router;
