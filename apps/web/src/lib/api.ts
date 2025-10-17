import { createClient } from '@supabase/supabase-js';
import type { User, SubscriptionTier } from '../types';

// ---------- Supabase Setup (User, Profile, Subscriptions) ----------
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
export const updateSettings = async (settings: any) => {
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

const jsonHeaders = { 'Content-Type': 'application/json' } as const;

async function getAuthHeaders(extra?: Record<string, string>) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Authentication required');
  }
  return {
    Authorization: `Bearer ${session.access_token}`,
    ...extra,
  } satisfies Record<string, string>;
}

async function authorizedFetch(path: string, init: RequestInit = {}) {
  const headers = await getAuthHeaders(init.headers as Record<string, string> | undefined);
  return fetch(`${backendBaseUrl}${path}`, {
    ...init,
    headers,
  });
}

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
  const response = await authorizedFetch(`/api/v2/alpaca/orders`, {
    method: 'POST',
    headers: jsonHeaders,
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
  const response = await authorizedFetch(`/api/v2/alpaca/account?env=${mode}`);
  if (!response.ok) {
    throw new Error('Failed to load Alpaca account');
  }
  return response.json();
};

export const fetchAlpacaHistory = async (mode: 'paper' | 'live') => {
  const response = await authorizedFetch(`/api/v2/alpaca/account/history?env=${mode}`);
  if (!response.ok) {
    throw new Error('Failed to load Alpaca history');
  }
  return response.json();
};

export const getAlpacaConnection = async (mode: 'paper' | 'live') => {
  const response = await authorizedFetch(`/api/v2/alpaca/connection?env=${mode}`);
  if (!response.ok) {
    throw new Error('Failed to lookup Alpaca connection');
  }
  return response.json();
};

export const disconnectAlpaca = async (mode: 'paper' | 'live') => {
  const response = await authorizedFetch(`/api/v2/alpaca/connection/${mode}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to disconnect Alpaca');
  }
};

export const startAlpacaOAuth = async (mode: 'paper' | 'live', returnTo?: string) => {
  const response = await authorizedFetch(`/api/v2/alpaca/oauth/start`, {
    method: 'POST',
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
};
