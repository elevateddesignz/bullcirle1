import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import './test-setup.js';
import { createAuthHeader, fetchMock, mockTradingClient, resetAllMocks } from './test-setup.js';

let app: Express;

beforeAll(async () => {
  ({ default: app } = await import('../src/server.js'));
});

beforeEach(() => {
  resetAllMocks();

  fetchMock.mockImplementation(async (url: string | URL) => {
    const requestUrl = new URL(String(url));
    const fn = requestUrl.searchParams.get('function');
    switch (fn) {
      case 'GLOBAL_QUOTE':
        return {
          ok: true,
          status: 200,
          json: async () => ({
            'Global Quote': {
              '01. symbol': requestUrl.searchParams.get('symbol') ?? 'SPY',
              '05. price': '432.10',
              '06. volume': '100',
              '07. latest trading day': '2024-01-12',
            },
          }),
        } as const;
      case 'TIME_SERIES_INTRADAY':
        return {
          ok: true,
          status: 200,
          json: async () => ({
            [`Time Series (${requestUrl.searchParams.get('interval')})`]: {
              '2024-01-12 10:31:00': {
                '1. open': '432.5',
                '2. high': '433.0',
                '3. low': '432.0',
                '4. close': '432.8',
                '5. volume': '1500',
              },
              '2024-01-12 10:30:00': {
                '1. open': '431.5',
                '2. high': '432.5',
                '3. low': '431.0',
                '4. close': '432.0',
                '5. volume': '1200',
              },
            },
          }),
        } as const;
      case 'NEWS_SENTIMENT':
        return {
          ok: true,
          status: 200,
          json: async () => ({
            feed: [
              {
                id: 'news-1',
                title: 'Market rally continues',
                summary: 'Stocks rise again',
                url: 'https://example.com/news-1',
                source: 'Example',
                time_published: '2024-01-12 10:00:00',
              },
              {
                id: 'news-2',
                title: 'Economic data released',
                summary: 'Key indicators beat expectations',
                url: 'https://example.com/news-2',
                source: 'Example',
                time_published: '2024-01-12 09:00:00',
              },
            ],
          }),
        } as const;
      default:
        return {
          ok: true,
          status: 200,
          json: async () => ({}),
        } as const;
    }
  });

  mockTradingClient.getClock.mockResolvedValue({
    is_open: true,
    next_open: '2024-01-16T13:30:00Z',
    next_close: '2024-01-16T20:00:00Z',
    timestamp: '2024-01-16T13:00:00Z',
  });
});

describe('Market routes (Alpha-backed)', () => {
  it('returns intraday bars sorted ascending', async () => {
    const response = await request(app)
      .get('/api/market/bars')
      .set('Authorization', createAuthHeader())
      .query({ symbol: 'SPY', timeframe: '5Min', limit: 2 })
      .expect(200);

    const bars = response.body.bars;
    expect(Array.isArray(bars)).toBe(true);
    expect(bars.length).toBeGreaterThan(0);
    for (let i = 1; i < bars.length; i += 1) {
      const prev = new Date(bars[i - 1].t).getTime();
      const curr = new Date(bars[i].t).getTime();
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  });

  it('returns Alpaca clock data when available', async () => {
    const response = await request(app)
      .get('/api/clock')
      .set('Authorization', createAuthHeader())
      .expect(200);

    expect(response.body).toMatchObject({
      is_open: true,
      next_open: '2024-01-16T13:30:00Z',
      next_close: '2024-01-16T20:00:00Z',
    });
    expect(typeof response.body.timestamp).toBe('string');
  });
});
