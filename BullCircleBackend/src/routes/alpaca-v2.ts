import { Router, type Request } from 'express';
import axios from 'axios';
import { requireRole, requireVerifiedEmail } from '../middleware/require-role.js';
import { createPerUserRateLimiter } from '../middleware/rate-limit.js';
import { alpacaBase, type AlpacaEnv } from '../lib/alpaca.js';
import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import { recordTradeAudit } from '../utils/trade-audit.js';
import {
  getAccount,
  getPositions,
  listOrders,
  placeOrder,
  cancelOrder,
  getOrder,
  type ListOrdersParams,
  type PlaceOrderParams,
} from '../services/trading.js';

const router = Router();

const orderRateLimiter = createPerUserRateLimiter();

interface RequestWithContext extends Request {
  auth?: {
    userId?: string;
    env?: string;
  };
  envMode?: string;
}

const ORDER_SIDES = new Set(['buy', 'sell']);
const ORDER_TYPES = new Set(['market', 'limit', 'stop', 'stop_limit', 'trailing_stop']);
const ORDER_TIME_IN_FORCE = new Set([
  'day',
  'gtc',
  'opg',
  'ioc',
  'fok',
  'gtc+etb',
  'gtc+dtb',
]);

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

function resolveRequestedEnv(req: RequestWithContext): AlpacaEnv {
  return (
    coerceEnv(req.headers['x-env-mode']) ??
    coerceEnv((req.params as Record<string, unknown>)?.env) ??
    coerceEnv((req.query.env as string) ?? (req.query.mode as string)) ??
    coerceEnv(req.envMode) ??
    coerceEnv(req.auth?.env) ??
    'paper'
  );
}

function applyRequestEnv(req: RequestWithContext, env: AlpacaEnv) {
  req.envMode = env;
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

function buildListOrdersParams(req: Request): ListOrdersParams | undefined {
  const params: ListOrdersParams = {};
  const query = req.query as Record<string, unknown>;

  if (typeof query.status === 'string') {
    const normalized = query.status.toLowerCase();
    if (normalized === 'open' || normalized === 'closed' || normalized === 'all') {
      params.status = normalized;
    }
  }
  if (typeof query.limit === 'string' || typeof query.limit === 'number') {
    const value = Number(query.limit);
    if (Number.isFinite(value)) {
      params.limit = Math.max(1, Math.floor(value));
    }
  }
  if (typeof query.after === 'string') {
    params.after = query.after;
  }
  if (typeof query.until === 'string') {
    params.until = query.until;
  }
  if (typeof query.direction === 'string') {
    const normalized = query.direction.toLowerCase();
    if (normalized === 'asc' || normalized === 'desc') {
      params.direction = normalized;
    }
  }
  if (typeof query.nested === 'string') {
    params.nested = query.nested.toLowerCase() === 'true';
  }
  if (typeof query.symbols === 'string') {
    params.symbols = query.symbols
      .split(',')
      .map(symbol => symbol.trim().toUpperCase())
      .filter(Boolean);
  }
  if (Array.isArray(query.symbols)) {
    params.symbols = (query.symbols as string[])
      .map(symbol => symbol.trim().toUpperCase())
      .filter(Boolean);
  }
  if (typeof query.side === 'string') {
    const normalized = query.side.toLowerCase();
    if (normalized === 'buy' || normalized === 'sell') {
      params.side = normalized;
    }
  }

  return Object.keys(params).length ? params : undefined;
}

function parsePlaceOrderPayload(payload: unknown): PlaceOrderParams {
  if (!payload || typeof payload !== 'object') {
    const error = new Error('order payload required');
    (error as any).status = 400;
    throw error;
  }

  const data = payload as Record<string, unknown>;

  const symbol = typeof data.symbol === 'string' ? data.symbol.trim().toUpperCase() : undefined;
  if (!symbol) {
    const error = new Error('symbol is required');
    (error as any).status = 400;
    throw error;
  }

  const side = typeof data.side === 'string' ? data.side.trim().toLowerCase() : undefined;
  if (!side || !ORDER_SIDES.has(side)) {
    const error = new Error('side must be "buy" or "sell"');
    (error as any).status = 400;
    throw error;
  }

  const qtyRaw = data.qty;
  if (typeof qtyRaw !== 'number' && typeof qtyRaw !== 'string') {
    const error = new Error('qty must be a number or numeric string');
    (error as any).status = 400;
    throw error;
  }
  const qty = typeof qtyRaw === 'number' ? qtyRaw : qtyRaw.trim();
  if (typeof qty === 'string' && !qty) {
    const error = new Error('qty must be a number or numeric string');
    (error as any).status = 400;
    throw error;
  }

  const typeRaw = typeof data.type === 'string' ? data.type.trim().toLowerCase() : undefined;
  if (!typeRaw || !ORDER_TYPES.has(typeRaw)) {
    const error = new Error('type is invalid');
    (error as any).status = 400;
    throw error;
  }

  const tifRaw = typeof data.timeInForce === 'string' ? data.timeInForce.trim().toLowerCase() : undefined;
  if (!tifRaw || !ORDER_TIME_IN_FORCE.has(tifRaw)) {
    const error = new Error('timeInForce is invalid');
    (error as any).status = 400;
    throw error;
  }

  const order: PlaceOrderParams = {
    symbol,
    side,
    qty,
    type: typeRaw,
    timeInForce: tifRaw as PlaceOrderParams['timeInForce'],
  };

  if (typeof data.limitPrice === 'number') {
    order.limitPrice = data.limitPrice;
  } else if (typeof data.limitPrice === 'string' && data.limitPrice.trim()) {
    const value = Number(data.limitPrice);
    if (!Number.isFinite(value)) {
      const error = new Error('limitPrice must be numeric');
      (error as any).status = 400;
      throw error;
    }
    order.limitPrice = value;
  }

  if (typeof data.stopPrice === 'number') {
    order.stopPrice = data.stopPrice;
  } else if (typeof data.stopPrice === 'string' && data.stopPrice.trim()) {
    const value = Number(data.stopPrice);
    if (!Number.isFinite(value)) {
      const error = new Error('stopPrice must be numeric');
      (error as any).status = 400;
      throw error;
    }
    order.stopPrice = value;
  }

  if (typeof data.clientOrderId === 'string' && data.clientOrderId.trim()) {
    order.clientOrderId = data.clientOrderId.trim();
  }

  return order;
}

function ensureAuthenticated(req: RequestWithContext) {
  if (!req.auth?.userId) {
    const error = new Error('authentication required');
    (error as any).status = 401;
    throw error;
  }
}

router.get('/connection', requireRole(['free', 'paid', 'admin']), async (req, res) => {
  try {
    ensureAuthenticated(req as RequestWithContext);
  } catch (error) {
    return sendError(res, error, 'authentication required', 401);
  }

  const auth = (req as RequestWithContext).auth!;
  const env = resolveRequestedEnv(req as RequestWithContext);
  const connection = await prisma.brokerConnection.findFirst({
    where: { userId: auth.userId!, broker: 'alpaca', mode: env },
  });
  if (!connection) {
    return res.json({ connected: false, env });
  }
  res.json({
    connected: true,
    env,
    scopes: connection.scope ? connection.scope.split(' ') : [],
    accountId: connection.accountId,
    expiresAt: connection.expiresAt,
  });
});

router.delete('/connection/:env', requireRole(['free', 'paid', 'admin']), async (req, res) => {
  try {
    ensureAuthenticated(req as RequestWithContext);
  } catch (error) {
    return sendError(res, error, 'authentication required', 401);
  }

  const auth = (req as RequestWithContext).auth!;
  const env = resolveRequestedEnv(req as RequestWithContext);
  await prisma.brokerConnection.deleteMany({
    where: { userId: auth.userId!, broker: 'alpaca', mode: env },
  });
  res.status(204).send();
});

router.get('/account', requireRole(['free', 'paid', 'admin']), async (req, res) => {
  try {
    ensureAuthenticated(req as RequestWithContext);
  } catch (error) {
    return sendError(res, error, 'authentication required', 401);
  }

  const auth = (req as RequestWithContext).auth!;
  const env = resolveRequestedEnv(req as RequestWithContext);
  applyRequestEnv(req as RequestWithContext, env);

  try {
    const account = await getAccount(req);
    res.json({ env, account });
  } catch (error) {
    logger.error({ err: error, userId: auth.userId, env }, 'Failed to fetch Alpaca account');
    sendError(res, error, 'Failed to fetch Alpaca account', 502);
  }
});

router.get('/positions', requireRole(['free', 'paid', 'admin']), async (req, res) => {
  try {
    ensureAuthenticated(req as RequestWithContext);
  } catch (error) {
    return sendError(res, error, 'authentication required', 401);
  }

  const auth = (req as RequestWithContext).auth!;
  const env = resolveRequestedEnv(req as RequestWithContext);
  applyRequestEnv(req as RequestWithContext, env);

  try {
    const positions = await getPositions(req);
    res.json({ env, positions });
  } catch (error) {
    logger.error({ err: error, userId: auth.userId, env }, 'Failed to fetch Alpaca positions');
    sendError(res, error, 'Failed to fetch Alpaca positions', 502);
  }
});

router.get('/orders', requireRole(['free', 'paid', 'admin']), async (req, res) => {
  try {
    ensureAuthenticated(req as RequestWithContext);
  } catch (error) {
    return sendError(res, error, 'authentication required', 401);
  }

  const auth = (req as RequestWithContext).auth!;
  const env = resolveRequestedEnv(req as RequestWithContext);
  applyRequestEnv(req as RequestWithContext, env);
  const params = buildListOrdersParams(req);

  try {
    const orders = await listOrders(req, params);
    res.json({ env, orders });
  } catch (error) {
    logger.error({ err: error, userId: auth.userId, env, params }, 'Failed to list Alpaca orders');
    sendError(res, error, 'Failed to list Alpaca orders', 502);
  }
});

router.post('/orders', requireRole(['paid', 'admin']), requireVerifiedEmail(), orderRateLimiter, async (req, res) => {
  try {
    ensureAuthenticated(req as RequestWithContext);
  } catch (error) {
    return sendError(res, error, 'authentication required', 401);
  }

  const auth = (req as RequestWithContext).auth!;
  const env = resolveRequestedEnv(req as RequestWithContext);
  applyRequestEnv(req as RequestWithContext, env);

  let orderParams: PlaceOrderParams;
  try {
    orderParams = parsePlaceOrderPayload(req.body?.order);
  } catch (error) {
    return sendError(res, error, 'order payload required', 400);
  }

  try {
    const response = await placeOrder(req, orderParams);
    await recordTradeAudit({
      userId: auth.userId!,
      env,
      action: 'alpaca.order.create',
      status: 'success',
      requestPayload: orderParams,
      responsePayload: response,
    });
    res.status(201).json(response);
  } catch (error) {
    await recordTradeAudit({
      userId: auth.userId!,
      env,
      action: 'alpaca.order.create',
      status: 'error',
      requestPayload: orderParams,
      error,
    });
    logger.error({ err: error, userId: auth.userId, env }, 'Failed to place Alpaca order');
    sendError(res, error, 'order failed');
  }
});

router.get('/orders/:id', requireRole(['free', 'paid', 'admin']), async (req, res) => {
  try {
    ensureAuthenticated(req as RequestWithContext);
  } catch (error) {
    return sendError(res, error, 'authentication required', 401);
  }

  const auth = (req as RequestWithContext).auth!;
  const env = resolveRequestedEnv(req as RequestWithContext);
  applyRequestEnv(req as RequestWithContext, env);

  const id = req.params.id;
  try {
    const order = await getOrder(req, id);
    res.json({ env, order });
  } catch (error) {
    logger.error({ err: error, userId: auth.userId, env, id }, 'Failed to fetch Alpaca order');
    sendError(res, error, 'Failed to fetch Alpaca order', 502);
  }
});

router.delete('/orders/:id', requireRole(['paid', 'admin']), orderRateLimiter, async (req, res) => {
  try {
    ensureAuthenticated(req as RequestWithContext);
  } catch (error) {
    return sendError(res, error, 'authentication required', 401);
  }

  const auth = (req as RequestWithContext).auth!;
  const env = resolveRequestedEnv(req as RequestWithContext);
  applyRequestEnv(req as RequestWithContext, env);

  const id = req.params.id;
  try {
    const result = await cancelOrder(req, id);
    await recordTradeAudit({
      userId: auth.userId!,
      env,
      action: 'alpaca.order.cancel',
      status: 'success',
      requestPayload: { id },
      responsePayload: result,
    });
    res.json(result ?? { cancelled: true });
  } catch (error) {
    await recordTradeAudit({
      userId: auth.userId!,
      env,
      action: 'alpaca.order.cancel',
      status: 'error',
      requestPayload: { id },
      error,
    });
    logger.error({ err: error, userId: auth.userId, env, id }, 'Failed to cancel Alpaca order');
    sendError(res, error, 'Failed to cancel Alpaca order');
  }
});

export default router;
