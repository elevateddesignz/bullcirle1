import { resolveApiPath } from './backendConfig';
import type { User, SubscriptionTier } from '../types';
import type { EnvMode } from '../contexts/EnvModeContext';
import { getEnvModeSnapshot } from '../contexts/EnvModeContext';
import { getAccessToken } from './authStorage';

const ABSOLUTE_URL_REGEX = /^https?:\/\//i;

type HeadersRecord = Record<string, string>;

function normalizeHeaders(headers?: HeadersInit): HeadersRecord {
  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) {
    const result: HeadersRecord = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  if (Array.isArray(headers)) {
    return headers.reduce<HeadersRecord>((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});
  }

  return { ...headers };
}

function findHeader(headers: HeadersRecord, name: string): string | undefined {
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) {
      return value;
    }
  }
  return undefined;
}

function setHeader(headers: HeadersRecord, name: string, value: string) {
  const existingKey = Object.keys(headers).find((key) => key.toLowerCase() === name.toLowerCase());
  if (existingKey) {
    headers[existingKey] = value;
  } else {
    headers[name] = value;
  }
}

async function getAuthHeaders(extra?: HeadersInit): Promise<HeadersRecord> {
  const headers = normalizeHeaders(extra);

  const token = getAccessToken();
  if (token) {
    setHeader(headers, 'Authorization', `Bearer ${token}`);
  }

  return headers;
}

export async function marketFetch(path: string, init: RequestInit = {}) {
  const headers = await getAuthHeaders(init.headers);
  const target = ABSOLUTE_URL_REGEX.test(path) ? path : resolveApiPath(path);

  return fetch(target, {
    ...init,
    headers,
  });
}

type TradeFetchInit = RequestInit & { envMode?: EnvMode };

export async function tradeFetch(path: string, init: TradeFetchInit = {}) {
  const { envMode, ...rest } = init;
  const headers = normalizeHeaders(rest.headers);
  const headerEnvMode = findHeader(headers, 'x-env-mode');
  const resolvedEnvMode = envMode
    ?? (headerEnvMode === 'live'
      ? 'live'
      : headerEnvMode === 'paper'
        ? 'paper'
        : getEnvModeSnapshot());

  setHeader(headers, 'x-env-mode', resolvedEnvMode);

  const authHeaders = await getAuthHeaders(headers);
  const hasContentType = Boolean(findHeader(authHeaders, 'content-type'));
  const method = (rest.method ?? 'GET').toUpperCase();
  if (rest.body && method !== 'GET' && !hasContentType) {
    setHeader(authHeaders, 'Content-Type', 'application/json');
  }

  const target = ABSOLUTE_URL_REGEX.test(path)
    ? path
    : resolveApiPath(path);

  return fetch(target, {
    ...rest,
    headers: authHeaders,
  });
}

export type MarketQuote = {
  symbol: string;
  bidPrice: number | null;
  askPrice: number | null;
  bidSize: number | null;
  askSize: number | null;
  ts: string | null;
};

export interface ChartBar {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
}

export interface ChartDataResponse {
  bars: ChartBar[];
}

interface ChartDataParams {
  symbol: string;
  timeframe: string;
  market?: string;
}

interface StockDataParams {
  symbol: string;
}

interface ExecuteTradeParams {
  symbol: string;
  side: 'buy' | 'sell';
  qty: number;
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  time_in_force: 'day' | 'gtc' | 'opg';
  limit_price?: number;
  stop_price?: number;
}

const jsonHeaders = { 'Content-Type': 'application/json' } as const;

export const getProfile = async (): Promise<User> => {
  const response = await tradeFetch('/profile');
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Failed to load profile');
  }
  return response.json() as Promise<User>;
};

export const getSubscriptionTiers = async (): Promise<SubscriptionTier[]> => {
  const response = await fetch(resolveApiPath('/pricing-plans'));
  if (!response.ok) {
    return [];
  }
  return response.json() as Promise<SubscriptionTier[]>;
};

export const upgradeTier = async (tierId: string) => {
  const response = await tradeFetch('/subscriptions/upgrade', {
    method: 'POST',
    body: JSON.stringify({ tierId }),
    headers: jsonHeaders,
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Upgrade failed');
  }
  return response.json();
};

export const updateSettings = async (settings: Record<string, unknown>) => {
  const response = await tradeFetch('/profile/settings', {
    method: 'PATCH',
    headers: jsonHeaders,
    body: JSON.stringify({ settings }),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Settings update failed');
  }
  return response.json();
};

export const getMarketQuote = async (symbol: string, market?: string): Promise<MarketQuote> => {
  if (!symbol.trim()) {
    throw new Error('Symbol is required');
  }

  const params = new URLSearchParams({ symbol: symbol.trim().toUpperCase() });
  if (market) {
    params.set('market', market);
  }

  const response = await marketFetch(`/market/quote?${params.toString()}`);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Failed to fetch market quote');
  }

  return response.json() as Promise<MarketQuote>;
};

export const fetchChartData = async ({ symbol, timeframe, market }: ChartDataParams): Promise<ChartDataResponse> => {
  if (!symbol.trim()) {
    return { bars: [] };
  }

  const params = new URLSearchParams({
    symbol: symbol.trim().toUpperCase(),
    timeframe,
  });
  if (market) {
    params.set('market', market);
  }

  const response = await marketFetch(`/market/bars?${params.toString()}`);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Failed to load chart data');
  }

  const data = (await response.json()) as unknown;
  if (!data || typeof data !== 'object') {
    return { bars: [] };
  }

  const bars = Array.isArray((data as { bars?: unknown }).bars)
    ? ((data as { bars: ChartBar[] }).bars)
    : [];

  return { bars };
};

export const fetchStockData = async ({ symbol }: StockDataParams) => {
  if (!symbol.trim()) {
    throw new Error('Symbol is required');
  }

  const response = await marketFetch(`/stock-data?symbol=${encodeURIComponent(symbol.trim().toUpperCase())}`);
  if (!response.ok) {
    throw new Error(`Error fetching stock data: ${response.statusText}`);
  }

  const data = await response.json() as { bars?: Array<{ o: number; c: number; v: number }> };
  const bars = Array.isArray(data?.bars) ? data.bars : [];
  if (bars.length === 0) {
    throw new Error(`No data available for ${symbol}`);
  }

  const bar = bars[0];
  return {
    name: symbol.trim().toUpperCase(),
    price: bar.c,
    change: {
      amount: bar.c - bar.o,
      percentage: ((bar.c - bar.o) / bar.o) * 100,
    },
    marketCap: undefined,
    volume: bar.v,
    peRatio: undefined,
  };
};

export const executeTrade = async (
  params: ExecuteTradeParams,
  mode: 'paper' | 'live' = 'paper',
) => {
  const response = await tradeFetch('/v2/alpaca/orders', {
    method: 'POST',
    headers: jsonHeaders,
    envMode: mode,
    body: JSON.stringify({
      env: mode,
      order: {
        symbol: params.symbol,
        side: params.side,
        type: params.type,
        time_in_force: params.time_in_force,
        qty: params.qty,
        ...(params.type === 'limit' && { limit_price: params.limit_price }),
        ...(params.type === 'stop' && { stop_price: params.stop_price }),
        ...(params.type === 'stop_limit' && {
          stop_price: params.stop_price,
          limit_price: params.limit_price,
        }),
      },
    }),
  });

  if (!response.ok) {
    const errorMsg = await response.text();
    throw new Error(`Trade execution failed: ${errorMsg}`);
  }

  return response.json();
};

export const fetchAlpacaAccount = async (mode: 'paper' | 'live') => {
  const response = await tradeFetch('/v2/alpaca/account', { envMode: mode });
  if (!response.ok) {
    throw new Error('Failed to load Alpaca account');
  }
  return response.json();
};

export const fetchAlpacaHistory = async (mode: 'paper' | 'live') => {
  const response = await tradeFetch('/v2/alpaca/account/history', { envMode: mode });
  if (!response.ok) {
    throw new Error('Failed to load Alpaca history');
  }
  return response.json();
};

export const getAlpacaConnection = async (mode: 'paper' | 'live') => {
  const response = await tradeFetch('/v2/alpaca/connection', { envMode: mode });
  if (!response.ok) {
    throw new Error('Failed to lookup Alpaca connection');
  }
  return response.json();
};

export const disconnectAlpaca = async (mode: 'paper' | 'live') => {
  const response = await tradeFetch(`/v2/alpaca/connection/${mode}`, {
    method: 'DELETE',
    envMode: mode,
  });
  if (!response.ok) {
    throw new Error('Failed to disconnect Alpaca');
  }
};

export const startAlpacaOAuth = async (mode: 'paper' | 'live', returnTo?: string) => {
  const response = await tradeFetch('/v2/alpaca/oauth/start', {
    method: 'POST',
    envMode: mode,
    headers: jsonHeaders,
    body: JSON.stringify({ env: mode, returnTo }),
  });
  if (!response.ok) {
    throw new Error('Failed to initiate Alpaca OAuth');
  }
  return response.json() as Promise<{ url: string; state: string }>;
};

export const api = {
  getProfile,
  getSubscriptionTiers,
  upgradeTier,
  updateSettings,
  fetchChartData,
  fetchStockData,
  executeTrade,
  fetchAlpacaAccount,
  fetchAlpacaHistory,
  getAlpacaConnection,
  disconnectAlpaca,
  startAlpacaOAuth,
  getMarketQuote,
  marketFetch,
  tradeFetch,
};
