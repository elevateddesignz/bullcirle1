import { Router } from 'express';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import { getAlphaHistory } from '../lib/alphaHistory.js';

const router = Router();

const CACHE_DIR = path.resolve('cache');
const SYMBOL_CACHE_FILE = path.join(CACHE_DIR, 'symbols-cache.json');

fs.mkdirSync(CACHE_DIR, { recursive: true });

const AV_KEY = process.env.ALPHA_VANTAGE_API_KEY;

const avURL = (fn: string, sym = '', extra = '') =>
  `https://www.alphavantage.co/query?function=${fn}&symbol=${sym}${extra}&apikey=${AV_KEY}`;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function throttledFetch(sym: string, fn: string, extra = ''): Promise<any> {
  await delay(110);
  const response = await fetch(avURL(fn, sym, extra));
  const json = await response.json();
  if ((json as any).Note) throw new Error('AlphaVantage rate-limit');
  if (!response.ok) throw new Error(`AlphaVantage ${fn}:${sym} → ${response.status}`);
  return json;
}

async function fetchAndCacheSymbols() {
  try {
    const stockCsv = await (await fetch(avURL('LISTING_STATUS') + '&state=active')).text();
    const stocks = stockCsv.split('\n').slice(1).filter(Boolean).map(line => line.split(',')[0]);

    const cryptoCsv = await (await fetch(avURL('DIGITAL_CURRENCY_LIST'))).text();
    const cryptos = cryptoCsv.split('\n').slice(1).filter(Boolean).map(line => line.split(',')[0]);

    fs.writeFileSync(SYMBOL_CACHE_FILE, JSON.stringify([...stocks, ...cryptos]));
    console.log(`[Cache] Saved ${stocks.length + cryptos.length} symbols`);
  } catch (error) {
    console.error('[Cache] symbol fetch error:', error);
  }
}

function loadCachedSymbols(): string[] {
  try {
    return JSON.parse(fs.readFileSync(SYMBOL_CACHE_FILE, 'utf-8')) as string[];
  } catch {
    return [];
  }
}

fetchAndCacheSymbols();
cron.schedule('0 */12 * * *', fetchAndCacheSymbols);

router.get('/alpha-quotes', async (req, res) => {
  const symbols = (req.query.symbols as string || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  if (!symbols.length) {
    return res.status(400).json({ error: 'symbols required' });
  }
  try {
    const quotes: Record<string, any> = {};
    for (const sym of symbols) {
      quotes[sym] = (await throttledFetch(sym, 'GLOBAL_QUOTE'))['Global Quote'] ?? {};
    }
    res.json({ quotes });
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : 'Failed to fetch quotes' });
  }
});

router.get('/crypto-quotes', async (req, res) => {
  const symbols = (req.query.symbols as string || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  if (!symbols.length) {
    return res.status(400).json({ error: 'symbols required' });
  }
  try {
    const quotes: Record<string, any> = {};
    for (const sym of symbols) {
      quotes[sym] = (await throttledFetch(sym, 'DIGITAL_CURRENCY_GLOBAL_QUOTE', '&market=USD'))['Digital Currency Global Quote'] ?? {};
    }
    res.json({ quotes });
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : 'Failed to fetch crypto quotes' });
  }
});

router.get('/alpha-history', async (req, res) => {
  const symbol = (req.query.symbol as string || '').toUpperCase();
  if (!symbol) return res.status(400).json({ error: 'symbol required' });
  try {
    res.json({ symbol, history: await getAlphaHistory(symbol) });
  } catch (error) {
    res.status(502).json({ error: 'history fetch failed' });
  }
});

router.get('/alpha-news', async (_req, res) => {
  try {
    const feed = (await throttledFetch('', 'NEWS_SENTIMENT')).feed || [];
    res.json({ news: feed.map((article: any) => ({
      title: article.title,
      summary: article.summary || article.body,
      url: article.url,
      datetime: article.time_published,
      source: article.source || article.provider,
    })) });
  } catch {
    res.status(502).json({ error: 'news fetch failed' });
  }
});

router.get('/alpha-search', async (req, res) => {
  const query = (req.query.query as string || '').trim();
  if (!query) return res.status(400).json({ error: 'query required' });
  try {
    const json = await throttledFetch(query, 'SYMBOL_SEARCH', `&keywords=${encodeURIComponent(query)}`);
    res.json({
      results: (json.bestMatches || []).map((match: any) => ({
        symbol: match['1. symbol'],
        name: match['2. name'],
        region: match['4. region'],
        currency: match['8. currency'],
      })),
    });
  } catch {
    res.status(502).json({ error: 'search failed' });
  }
});

router.get('/alpha-listings', async (_req, res) => {
  try {
    const response = await fetch(avURL('LISTING_STATUS'));
    if (!response.ok) {
      return res.status(response.status).send(await response.text());
    }
    res.type('text/csv').send(await response.text());
  } catch {
    res.status(502).json({ error: 'listings failed' });
  }
});

router.get('/chart-data', async (req, res) => {
  const symbol = (req.query.symbol as string || '').toUpperCase();
  const market = req.query.market === 'forex' ? 'forex' : 'stocks';
  if (!symbol) return res.status(400).json({ error: 'symbol required' });
  try {
    const fn = market === 'forex' ? 'FX_DAILY' : 'TIME_SERIES_DAILY';
    const key = market === 'forex' ? 'Time Series FX (Daily)' : 'Time Series (Daily)';
    const series = (await throttledFetch(symbol, fn))[key] || {};
    res.json({
      bars: Object.keys(series)
        .sort()
        .map(date => ({
          t: date,
          o: +series[date]['1. open'],
          h: +series[date]['2. high'],
          l: +series[date]['3. low'],
          c: +series[date]['4. close'],
        })),
    });
  } catch {
    res.status(502).json({ error: 'chart fetch failed' });
  }
});

router.get('/stock-data', async (req, res) => {
  const symbol = (req.query.symbol as string || '').toUpperCase();
  if (!symbol) return res.status(400).json({ error: 'symbol required' });
  try {
    const series = (await throttledFetch(symbol, 'TIME_SERIES_INTRADAY', '&interval=1min'))['Time Series (1min)'] || {};
    res.json({
      bars: Object.keys(series)
        .sort()
        .map(date => ({
          t: date,
          o: +series[date]['1. open'],
          h: +series[date]['2. high'],
          l: +series[date]['3. low'],
          c: +series[date]['4. close'],
        })),
    });
  } catch {
    res.status(502).json({ error: 'stock fetch failed' });
  }
});

router.get('/tradingbot/fullscan/init', (_req, res) => {
  try {
    const symbols = loadCachedSymbols();
    res.json({ count: symbols.length, symbols });
  } catch {
    res.status(500).json({ error: 'symbol cache missing' });
  }
});

router.get('/tradingbot/symbols', (_req, res) => {
  res.json({ symbols: loadCachedSymbols() });
});

export default router;
