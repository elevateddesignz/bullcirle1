import { supabase } from './supabaseClient';
// Re-export Supabase client for backwards compatibility
export { supabase };
/**
 * Fetch the authenticated user's profile and subscriptions
 */
export const getProfile = async (): Promise<User> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No user found');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (profileError) throw profileError;

  const { data: subscriptions, error: subscriptionError } = await supabase
    .from('user_subscriptions')
    .select('*, subscription_tiers(*)')
    .eq('user_id', user.id)
    .single();
  if (subscriptionError && subscriptionError.code !== 'PGRST116') {
    throw subscriptionError;
  }

  return {
    ...profile,
    email: user.email!,
    joinDate: user.created_at!,
    tradingStats: {
      totalTrades: 0,
      winRate: 0,
      profitLoss: 0,
    },
    user_subscriptions: subscriptions ? [subscriptions] : []
  };
};

/**
 * List available subscription tiers
 */
export const getSubscriptionTiers = async (): Promise<SubscriptionTier[]> => {
  const { data, error } = await supabase
    .from('subscription_tiers')
    .select('*')
    .order('price', { ascending: true });
  if (error) throw error;
  return data;
};

/**
 * Upgrade the current user to a new subscription tier
 */
export const upgradeTier = async (tierId: string) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No user found');
  const { data, error } = await supabase
    .from('user_subscriptions')
    .update({
      tier_id: tierId,
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    })
    .eq('user_id', user.id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

/**
 * Update user profile settings
 */
export const updateSettings = async (settings: Record<string, unknown>) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No user found');
  const { error } = await supabase
    .from('profiles')
    .update({ settings })
    .eq('id', user.id);
  if (error) throw error;
};

// ---------- Trading API Setup ----------
const backendBaseUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL;
if (!backendBaseUrl) {
  throw new Error('Missing backend URL environment variable (VITE_BACKEND_URL or VITE_API_URL)');
}

  market?: string;
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

export const fetchChartData = async ({ symbol, timeframe, market }: ChartDataParams): Promise<ChartDataResponse> => {
  const searchParams = new URLSearchParams({ symbol, timeframe });
  if (market) {
    searchParams.set('market', market);
  }
  const endpoint = `${backendBaseUrl}/api/chart-data?${searchParams.toString()}`;
  const data = (await response.json()) as unknown;
  if (!data || typeof data !== 'object' || !Array.isArray((data as { bars?: unknown }).bars)) {
    return { bars: [] };
  }
  return { bars: (data as { bars: ChartBar[] }).bars };
  if (!path.startsWith('/')) {
    return normalizeApiPath(`/${path}`);
  }
  if (path.startsWith('/api')) {
    return path;
  }
  return `/api${path}`;
}

const jsonHeaders = { 'Content-Type': 'application/json' } as const;

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
  const existingKey = Object.keys(headers).find(key => key.toLowerCase() === name.toLowerCase());
  if (existingKey) {
    headers[existingKey] = value;
  } else {
    headers[name] = value;
  }
}

async function getAuthHeaders(extra?: HeadersInit): Promise<HeadersRecord> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Authentication required');
  }
  const headers = normalizeHeaders(extra);
  setHeader(headers, 'Authorization', `Bearer ${session.access_token}`);
  return headers;
}

export async function marketFetch(path: string, init: RequestInit = {}) {
  const headers = await getAuthHeaders(init.headers);
  return fetch(`${backendBaseUrl}${normalizeApiPath(path)}`, {
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

  return fetch(`${backendBaseUrl}${normalizeApiPath(path)}`, {
    ...rest,
    headers: authHeaders,
  });
}

export interface MarketQuote {
  symbol: string;
  bidPrice: number | null;
  askPrice: number | null;
  bidSize: number | null;
  askSize: number | null;
  ts: string | null;
}

export const getMarketQuote = async (symbol: string): Promise<MarketQuote> => {
  if (!symbol?.trim()) {
    throw new Error('Symbol is required');
  }
  const query = new URLSearchParams({ symbol: symbol.trim().toUpperCase() });
  const response = await marketFetch(`/api/market/quote?${query.toString()}`);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Failed to fetch market quote');
  }
  return response.json() as Promise<MarketQuote>;
};

// --- Chart Data ---
interface ChartDataParams {
  symbol: string;
  timeframe: string;
}
export const fetchChartData = async ({ symbol, timeframe }: ChartDataParams) => {
  const endpoint = `${backendBaseUrl}/api/chart-data?symbol=${symbol}&timeframe=${timeframe}`;
  const response = await fetch(endpoint);
  if (!response.ok) throw new Error(`Error fetching chart data: ${response.statusText}`);
  return response.json();
};

// --- Stock Data ---
interface StockDataParams {
  symbol: string;
}
export const fetchStockData = async ({ symbol }: StockDataParams) => {
  const endpoint = `${backendBaseUrl}/api/stock-data?symbol=${symbol}`;
  const response = await fetch(endpoint);
  if (!response.ok) throw new Error(`Error fetching stock data: ${response.statusText}`);
  const data = await response.json();
  if (!data.bars || data.bars.length === 0) {
    throw new Error(`No data available for ${symbol}`);
  }
  const bar = data.bars[0];
  return {
    name: symbol,
    price: bar.c,
    change: {
      amount: bar.c - bar.o,
      percentage: ((bar.c - bar.o) / bar.o) * 100
    },
    marketCap: undefined,
    volume: bar.v,
    peRatio: undefined,
  };
};

// --- Execute Trade ---
interface ExecuteTradeParams {
  symbol:      string;
  side:        'buy' | 'sell';
  qty:         number;
  type:        'market' | 'limit' | 'stop' | 'stop_limit';
  time_in_force: 'day' | 'gtc' | 'opg';
  limit_price?: number;
  stop_price?:  number;
}
export const executeTrade = async (
  params: ExecuteTradeParams,
  mode: 'paper' | 'live' = 'paper'
) => {
  const response = await tradeFetch(`/api/v2/alpaca/orders`, {
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
  const response = await tradeFetch(`/api/v2/alpaca/account?env=${mode}`, {
    envMode: mode,
  });
  if (!response.ok) {
    throw new Error('Failed to load Alpaca account');
  }
  return response.json();
};

export const fetchAlpacaHistory = async (mode: 'paper' | 'live') => {
  const response = await tradeFetch(`/api/v2/alpaca/account/history?env=${mode}`, {
    envMode: mode,
  });
  if (!response.ok) {
    throw new Error('Failed to load Alpaca history');
  }
  return response.json();
};

export const getAlpacaConnection = async (mode: 'paper' | 'live') => {
  const response = await tradeFetch(`/api/v2/alpaca/connection?env=${mode}`, {
    envMode: mode,
  });
  if (!response.ok) {
    throw new Error('Failed to lookup Alpaca connection');
  }
  return response.json();
};

export const disconnectAlpaca = async (mode: 'paper' | 'live') => {
  const response = await tradeFetch(`/api/v2/alpaca/connection/${mode}`, {
    method: 'DELETE',
    envMode: mode,
  });
  if (!response.ok) {
    throw new Error('Failed to disconnect Alpaca');
  }
};

export const startAlpacaOAuth = async (mode: 'paper' | 'live', returnTo?: string) => {
  const response = await tradeFetch(`/api/v2/alpaca/oauth/start`, {
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

// ---------- API Export ----------
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
