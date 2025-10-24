import type { Request } from 'express';
import type { AxiosError, AxiosInstance } from 'axios';
import { randomUUID } from 'node:crypto';
import { getAlpacaClient, refreshTokenIfNeeded, type AlpacaEnv } from '../lib/alpaca.js';
import { logger } from '../lib/logger.js';

export type ListOrdersParams = {
  status?: 'open' | 'closed' | 'all';
  limit?: number;
  after?: string;
  until?: string;
  direction?: 'asc' | 'desc';
  nested?: boolean;
  symbols?: string[];
  side?: 'buy' | 'sell';
};

export type PlaceOrderParams = {
  symbol: string;
  side: 'buy' | 'sell';
  qty: number | string;
  type: 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop';
  limitPrice?: number;
  stopPrice?: number;
  timeInForce: 'day' | 'gtc' | 'opg' | 'ioc' | 'fok' | 'gtc+etb' | 'gtc+dtb';
  clientOrderId?: string;
};

export type PortfolioHistoryParams = {
  period?: string;
  timeframe?: string;
  dateEnd?: string;
  extendedHours?: boolean;
};

const MAX_ORDER_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 250;

const TRANSIENT_STATUS_CODES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

interface TradingRequest extends Request {
  auth?: {
    userId?: string;
    env?: string;
  };
  envMode?: string;
}

function extractString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }
  return undefined;
}

function coerceEnv(value: unknown): AlpacaEnv | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'paper' || normalized === 'live') {
    return normalized;
  }
  return undefined;
}

function resolveEnvMode(req: Request): AlpacaEnv {
  const tradingReq = req as TradingRequest;
  return (
    coerceEnv(req.headers['x-env-mode']) ??
    coerceEnv(extractString((req.query as Record<string, unknown>)?.mode)) ??
    coerceEnv(extractString((req.query as Record<string, unknown>)?.env)) ??
    coerceEnv(tradingReq.envMode) ??
    coerceEnv(tradingReq.auth?.env) ??
    'paper'
  );
}

function isAxiosError(error: unknown): error is AxiosError {
  return typeof error === 'object' && error !== null && 'isAxiosError' in error;
}

function isUnauthorized(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 401;
}

function isTransient(error: unknown): boolean {
  if (!isAxiosError(error)) {
    return false;
  }
  const status = error.response?.status;
  if (typeof status === 'number' && TRANSIENT_STATUS_CODES.has(status)) {
    return true;
  }
  return !error.response;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

async function withTradingClient<T>(
  req: Request,
  executor: (client: AxiosInstance, env: AlpacaEnv) => Promise<T>
): Promise<T> {
  const env = resolveEnvMode(req);
  try {
    const client = await getAlpacaClient(req, env);
    return await executor(client, env);
  } catch (error) {
    if (isUnauthorized(error)) {
      const userId = (req as TradingRequest).auth?.userId;
      if (!userId) {
        throw error;
      }
      logger.warn({ userId, env }, 'Alpaca client returned 401; attempting token refresh');
      return refreshTokenIfNeeded(userId, env, client => executor(client, env));
    }
    throw error;
  }
}

function buildOrderPayload(params: PlaceOrderParams, clientOrderId: string) {
  const qtyString = typeof params.qty === 'number' ? params.qty.toString() : params.qty;
  const payload: Record<string, unknown> = {
    symbol: params.symbol.trim().toUpperCase(),
    side: params.side,
    qty: qtyString,
    type: params.type,
    time_in_force: params.timeInForce,
    client_order_id: clientOrderId,
  };
  if (typeof params.limitPrice === 'number') {
    payload.limit_price = params.limitPrice;
  }
  if (typeof params.stopPrice === 'number') {
    payload.stop_price = params.stopPrice;
  }
  return payload;
}

function normalizeListOrdersParams(params?: ListOrdersParams): Record<string, string> | undefined {
  if (!params) {
    return undefined;
  }
  const query: Record<string, string> = {};
  if (params.status) {
    query.status = params.status;
  }
  if (typeof params.limit === 'number' && Number.isFinite(params.limit)) {
    query.limit = Math.max(1, Math.floor(params.limit)).toString();
  }
  if (params.after) {
    query.after = params.after;
  }
  if (params.until) {
    query.until = params.until;
  }
  if (params.direction) {
    query.direction = params.direction;
  }
  if (typeof params.nested === 'boolean') {
    query.nested = params.nested ? 'true' : 'false';
  }
  if (Array.isArray(params.symbols) && params.symbols.length > 0) {
    query.symbols = params.symbols.map(symbol => symbol.trim().toUpperCase()).join(',');
  }
  if (params.side) {
    query.side = params.side;
  }
  return Object.keys(query).length ? query : undefined;
}

function normalizePortfolioHistoryParams(params?: PortfolioHistoryParams): Record<string, string> | undefined {
  if (!params) {
    return undefined;
  }
  const query: Record<string, string> = {};
  if (params.period) {
    query.period = params.period;
  }
  if (params.timeframe) {
    query.timeframe = params.timeframe;
  }
  if (params.dateEnd) {
    query.date_end = params.dateEnd;
  }
  if (typeof params.extendedHours === 'boolean') {
    query.extended_hours = params.extendedHours ? 'true' : 'false';
  }
  return Object.keys(query).length ? query : undefined;
}

function createClientOrderId(provided?: string): string {
  if (provided?.trim()) {
    return provided.trim();
  }
  return `bullcircle-${randomUUID()}`;
}

export async function getAccount(req: Request) {
  return withTradingClient(req, async client => {
    const response = await client.get('/v2/account');
    return response.data;
  });
}

export async function getPositions(req: Request) {
  return withTradingClient(req, async client => {
    const response = await client.get('/v2/positions');
    return response.data;
  });
}

export async function listOrders(req: Request, params?: ListOrdersParams) {
  return withTradingClient(req, async client => {
    const response = await client.get('/v2/orders', {
      params: normalizeListOrdersParams(params),
    });
    return response.data;
  });
}

export async function placeOrder(req: Request, params: PlaceOrderParams) {
  const clientOrderId = createClientOrderId(params.clientOrderId);
  let attempt = 0;
  while (true) {
    try {
      return await withTradingClient(req, async client => {
        const response = await client.post('/v2/orders', buildOrderPayload(params, clientOrderId));
        return response.data;
      });
    } catch (error) {
      attempt += 1;
      if (attempt >= MAX_ORDER_RETRIES || !isTransient(error)) {
        throw error;
      }
      const delay = BASE_RETRY_DELAY_MS * 2 ** (attempt - 1);
      logger.warn(
        { attempt, delay, error: isAxiosError(error) ? error.message : String(error) },
        'Transient Alpaca order error; retrying'
      );
      await sleep(delay);
    }
  }
}

export async function cancelOrder(req: Request, id: string) {
  if (!id?.trim()) {
    const error = new Error('Order id is required');
    (error as any).status = 400;
    throw error;
  }
  return withTradingClient(req, async client => {
    const response = await client.delete(`/v2/orders/${id}`);
    return response.data;
  });
}

export async function getOrder(req: Request, id: string) {
  if (!id?.trim()) {
    const error = new Error('Order id is required');
    (error as any).status = 400;
    throw error;
  }
  return withTradingClient(req, async client => {
    const response = await client.get(`/v2/orders/${id}`);
    return response.data;
  });
}

export async function getPortfolioHistory(req: Request, params?: PortfolioHistoryParams) {
  return withTradingClient(req, async client => {
    const response = await client.get('/v2/account/portfolio/history', {
      params: normalizePortfolioHistoryParams(params),
    });
    return response.data;
  });
}

