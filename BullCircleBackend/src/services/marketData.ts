import fetch from 'node-fetch';
import { logger } from '../lib/logger.js';

export type Quote = {
  symbol: string;
  price: number | null;
  lastPrice: number | null;
  bidPrice: number | null;
  askPrice: number | null;
  bidSize: number | null;
  askSize: number | null;
  ts: string | null;
};

export type Trade = {
  symbol: string;
  price: number;
  size: number;
  ts: string;
};

export type Bar = {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

export type NewsItem = {
  id: number | string;
  symbol: string;
  headline: string;
  summary?: string;
  url?: string;
  source?: string;
  ts?: string;
};

export type TickerSearchItem = {
  symbol: string;
  name?: string;
  region?: string;
  currency?: string;
  type?: string;
};

const API_BASE = 'https://www.alphavantage.co/query';
const { ALPHA_VANTAGE_API_KEY } = process.env;

const TIMEFRAME_MAP: Record<'1Min' | '5Min' | '15Min' | '30Min' | '60Min', string> = {
  '1Min': '1min',
  '5Min': '5min',
  '15Min': '15min',
  '30Min': '30min',
  '60Min': '60min'
};

const DEFAULT_TIMEFRAME: keyof typeof TIMEFRAME_MAP = '60Min';

function resolveTimeframeKey(timeframe?: string | null): keyof typeof TIMEFRAME_MAP {
  if (!timeframe) {
    return DEFAULT_TIMEFRAME;
  }
  const normalized = timeframe.trim();
  const match = (Object.keys(TIMEFRAME_MAP) as Array<keyof typeof TIMEFRAME_MAP>).find(
    key => key.toLowerCase() === normalized.toLowerCase()
  );
  return match ?? DEFAULT_TIMEFRAME;
}

type AlphaResponse = Record<string, any>;

function assertAlphaConfigured(): void {
  if (!ALPHA_VANTAGE_API_KEY) {
    const error = new Error('Alpha Vantage API key is not configured');
    (error as any).status = 500;
    throw error;
  }
}

async function alphaFetch<T extends AlphaResponse>(fn: string, params: Record<string, string>): Promise<T> {
  assertAlphaConfigured();
  const search = new URLSearchParams({
    function: fn,
    apikey: ALPHA_VANTAGE_API_KEY!,
    datatype: 'json',
    ...params
  });
  const response = await fetch(`${API_BASE}?${search.toString()}`);
  if (!response.ok) {
    const error = new Error(`Alpha Vantage request failed with status ${response.status}`);
    (error as any).status = response.status;
    throw error;
  }
  const json = (await response.json()) as AlphaResponse;
  if (typeof json.Note === 'string' && json.Note.trim().length > 0) {
    logger.warn({ note: json.Note }, 'Alpha Vantage rate limit or informational note received');
    const error = new Error('Alpha Vantage note received');
    (error as any).status = 503;
    (error as any).code = 'ALPHA_RATE_LIMIT';
    (error as any).retryAfter = 60;
    throw error;
  }
  if (typeof json.Information === 'string' && json.Information.trim().length > 0) {
    logger.warn({ information: json.Information }, 'Alpha Vantage informational message received');
    const error = new Error('Alpha Vantage information received');
    (error as any).status = 503;
    (error as any).code = 'ALPHA_RATE_LIMIT';
    (error as any).retryAfter = 60;
    throw error;
  }
  if (typeof json['Error Message'] === 'string') {
    const error = new Error(json['Error Message']);
    (error as any).status = 400;
    throw error;
  }
  return json as T;
}

function toIsoTimestamp(value: string | undefined | null): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value.includes(' ') ? `${value}Z` : `${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

export async function getQuote(symbol: string): Promise<Quote> {
  const normalizedSymbol = symbol?.trim().toUpperCase();
  if (!normalizedSymbol) {
    const error = new Error('Symbol is required');
    (error as any).status = 400;
    throw error;
  }
  const response = await alphaFetch<AlphaResponse>('GLOBAL_QUOTE', { symbol: normalizedSymbol });
  const quote = response['Global Quote'] ?? {};
  const priceValue = Number.parseFloat(typeof quote['05. price'] === 'string' ? quote['05. price'] : '');
  return {
    symbol: normalizedSymbol,
    price: Number.isFinite(priceValue) ? priceValue : null,
    lastPrice: Number.isFinite(priceValue) ? priceValue : null,
    bidPrice: null,
    askPrice: null,
    bidSize: null,
    askSize: null,
    ts: toIsoTimestamp(typeof quote['07. latest trading day'] === 'string' ? quote['07. latest trading day'] : undefined)
  };
}

export async function getLatestTrade(symbol: string): Promise<Trade | null> {
  const normalizedSymbol = symbol?.trim().toUpperCase();
  if (!normalizedSymbol) {
    const error = new Error('Symbol is required');
    (error as any).status = 400;
    throw error;
  }
  const response = await alphaFetch<AlphaResponse>('GLOBAL_QUOTE', { symbol: normalizedSymbol });
  const trade = response['Global Quote'] ?? {};
  const price = Number.parseFloat(trade['05. price']);
  if (!Number.isFinite(price)) {
    return null;
  }
  const volume = Number.parseFloat(trade['06. volume']);
  return {
    symbol: normalizedSymbol,
    price,
    size: Number.isFinite(volume) ? volume : 0,
    ts:
      toIsoTimestamp(typeof trade['07. latest trading day'] === 'string' ? trade['07. latest trading day'] : undefined) ??
      new Date().toISOString()
  };
}

export async function getBars(
  symbol: string,
  timeframe?: string | null,
  limit?: number,
  start?: string,
  end?: string
): Promise<Bar[]> {
  const normalizedSymbol = symbol?.trim().toUpperCase();
  if (!normalizedSymbol) {
    const error = new Error('Symbol is required');
    (error as any).status = 400;
    throw error;
  }
  const timeframeKey = resolveTimeframeKey(timeframe);
  const params: Record<string, string> = {
    symbol: normalizedSymbol,
    interval: TIMEFRAME_MAP[timeframeKey],
    outputsize: limit && limit > 100 ? 'full' : 'compact'
  };

  const data = await alphaFetch<AlphaResponse>('TIME_SERIES_INTRADAY', params);
  const resultKey = `Time Series (${TIMEFRAME_MAP[timeframeKey]})`;
  const series = data[resultKey];
  if (!series || typeof series !== 'object') {
    return [];
  }
  const entries = Object.entries(series) as Array<[string, Record<string, any>]>;
  const filtered = entries.filter(([timestamp]) => {
    const iso = toIsoTimestamp(timestamp);
    if (!iso) {
      return false;
    }
    const ms = new Date(iso).getTime();
    if (start) {
      const startMs = new Date(start).getTime();
      if (!Number.isNaN(startMs) && ms < startMs) {
        return false;
      }
    }
    if (end) {
      const endMs = new Date(end).getTime();
      if (!Number.isNaN(endMs) && ms > endMs) {
        return false;
      }
    }
    return true;
  });
  const sliced = typeof limit === 'number' && limit > 0 ? filtered.slice(0, limit) : filtered;
  return sliced
    .map(([timestamp, values]) => ({
      t: toIsoTimestamp(timestamp) ?? new Date().toISOString(),
      o: Number.parseFloat(values['1. open'] ?? '0') || 0,
      h: Number.parseFloat(values['2. high'] ?? '0') || 0,
      l: Number.parseFloat(values['3. low'] ?? '0') || 0,
      c: Number.parseFloat(values['4. close'] ?? '0') || 0,
      v: Number.parseFloat(values['5. volume'] ?? '0') || 0
    }))
    .sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime());
}

export async function getNews(symbol: string, limit?: number): Promise<NewsItem[]> {
  const normalizedSymbol = symbol?.trim().toUpperCase();
  if (!normalizedSymbol) {
    const error = new Error('Symbol is required');
    (error as any).status = 400;
    throw error;
  }
  const params: Record<string, string> = { tickers: normalizedSymbol };
  if (typeof limit === 'number' && limit > 0) {
    params.limit = String(Math.min(limit, 50));
  }
  const response = await alphaFetch<AlphaResponse>('NEWS_SENTIMENT', params);
  const news = Array.isArray(response.feed)
    ? response.feed.map((item: Record<string, any>) => ({
        id: item?.id ?? `${normalizedSymbol}-${item?.time_published ?? Date.now()}`,
        symbol: normalizedSymbol,
        headline: item?.title ?? 'Untitled',
        summary: item?.summary ?? item?.body ?? undefined,
        url: item?.url ?? undefined,
        source: item?.source ?? item?.provider ?? undefined,
        ts: toIsoTimestamp(item?.time_published) ?? undefined
      }))
    : [];
  return news;
}

export async function searchTickers(query: string, limit?: number): Promise<TickerSearchItem[]> {
  if (!query?.trim()) {
    const error = new Error('Query is required');
    (error as any).status = 400;
    throw error;
  }
  const response = await alphaFetch<AlphaResponse>('SYMBOL_SEARCH', {
    keywords: query.trim()
  });
  const matches = Array.isArray(response.bestMatches) ? response.bestMatches : [];
  const sliceCount = typeof limit === 'number' && limit > 0 ? limit : matches.length;
  return matches
    .slice(0, sliceCount)
    .map((match: Record<string, any>) => ({
      symbol: match['1. symbol'] ?? '',
      name: match['2. name'] ?? undefined,
      region: match['4. region'] ?? undefined,
      currency: match['8. currency'] ?? undefined,
      type: match['3. type'] ?? undefined
    }));
}

