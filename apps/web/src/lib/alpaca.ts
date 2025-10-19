import { supabase } from './api';
import { createApiUrl } from './backendConfig';

async function getAuthHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Authentication required for Alpaca market data');
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
  } satisfies Record<string, string>;
}

export async function fetchBars(
  symbol: string,
  timeframe: string,
  start: Date,
  end: Date = new Date(),
  limit = 1000,
) {
  const url = createApiUrl('/v2/alpaca/market-data/bars');
  url.searchParams.set('symbol', symbol.toUpperCase());
  url.searchParams.set('timeframe', timeframe);
  url.searchParams.set('start', start.toISOString());
  url.searchParams.set('end', end.toISOString());
  url.searchParams.set('limit', String(limit));

  const response = await fetch(url.toString(), {
    headers: await getAuthHeaders(),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Failed to load Alpaca bars: ${response.status} ${message}`);
  }

  const data = await response.json();
  return data?.bars ?? [];
}

export const marketData = {
  async getBars(symbol: string, timeframe: string, start: Date, end?: Date, limit?: number) {
    return fetchBars(symbol, timeframe, start, end, limit);
  },
  async subscribeToSymbol(_symbol: string, _onUpdate: (data: any) => void) {
    console.warn('Live Alpaca streaming must be proxied through the backend. No-op subscribe invoked.');
  },
  unsubscribeFromSymbol(_symbol: string) {
    // Streaming is handled server-side; keep this as a no-op for compatibility.
  },
  disconnect() {
    // Nothing to do; connectivity is proxied via the backend.
  },
};
