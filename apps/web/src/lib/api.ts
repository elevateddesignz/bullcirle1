import { supabase, resolvedSupabaseUrl, resolvedSupabaseAnonKey } from './supabaseClient';
import { resolveApiPath } from './backendConfig';
import type { User, SubscriptionTier } from '../types';
import type { EnvMode } from '../contexts/EnvModeContext';
import { getEnvModeSnapshot } from '../contexts/EnvModeContext';

export { supabase };

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

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      setHeader(headers, 'Authorization', `Bearer ${session.access_token}`);
    }
  } catch (error) {
    console.warn('Failed to resolve Supabase session for authenticated request', error);
  }

  if (resolvedSupabaseUrl) {
    setHeader(headers, 'x-supabase-url', resolvedSupabaseUrl);
  }
  if (resolvedSupabaseAnonKey) {
    setHeader(headers, 'x-supabase-key', resolvedSupabaseAnonKey);
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('No user found');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (profileError) {
    throw profileError;
  }

  const { data: subscriptions, error: subscriptionError } = await supabase
    .from('user_subscriptions')
    .select('*, subscription_tiers(*)')
    .eq('user_id', user.id);
  if (subscriptionError && subscriptionError.code !== 'PGRST116') {
    throw subscriptionError;
  }

  return {
    ...profile,
    email: user.email ?? '',
    joinDate: user.created_at ?? new Date().toISOString(),
    tradingStats: {
      totalTrades: 0,
      winRate: 0,
      profitLoss: 0,
    },
    user_subscriptions: subscriptions ?? undefined,
  } as User;
};

export const getSubscriptionTiers = async (): Promise<SubscriptionTier[]> => {
  const { data, error } = await supabase
    .from('subscription_tiers')
    .select('*')
    .order('price', { ascending: true });
  if (error) {
    throw error;
  }
  return data ?? [];
};

export const upgradeTier = async (tierId: string) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('No user found');
  }

  const { data, error } = await supabase
    .from('user_subscriptions')
    .update({
      tier_id: tierId,
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const updateSettings = async (settings: Record<string, unknown>) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('No user found');
  }

  const { error } = await supabase
    .from('profiles')
    .update({ settings })
    .eq('id', user.id);
  if (error) {
    throw error;
  }
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
