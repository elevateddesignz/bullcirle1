// index.js   – BullCircle backend (merged 2025-05-01)

import express          from 'express';
import cors             from 'cors';
import dotenv           from 'dotenv';
import fetch            from 'node-fetch';
import cron             from 'node-cron';
import fs               from 'fs';
import path             from 'path';
import { PythonShell }  from 'python-shell';
import { getAlphaHistory } from './lib/alphaHistory.js';
import OpenAI           from 'openai';
import autopilotRouter  from './routes/autopilot.js'; // Added autopilot router

dotenv.config();

/*──────────────────────────  Setup  ──────────────────────────*/
const app  = express();
const PORT = process.env.PORT || 3000;

const CACHE_DIR         = path.resolve('cache');
const SYMBOL_CACHE_FILE = path.join(CACHE_DIR, 'symbols-cache.json');
fs.mkdirSync(CACHE_DIR, { recursive: true });

/*──────────────────────────  CORS  ───────────────────────────*/
app.use(cors({ origin: true, credentials: true }));
app.options('*', cors({ origin: true, credentials: true }));
app.use(express.json());

// Mount autopilot routes
app.use('/api/autopilot', autopilotRouter);

// Universal CORS headers (even on errors / OPTIONS)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers',
             'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods',
             'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

/*──────────────────────────  ENV  ────────────────────────────*/
const {
  ALPACA_PAPER_API_KEY,  ALPACA_PAPER_API_SECRET,  ALPACA_PAPER_BASE_URL,
  ALPACA_LIVE_API_KEY,   ALPACA_LIVE_API_SECRET,   ALPACA_LIVE_BASE_URL,
  ALPHA_VANTAGE_API_KEY, OPENAI_API_KEY
} = process.env;

const getAlpacaConfig = (mode='paper') =>
  mode === 'live'
    ? { baseUrl: ALPACA_LIVE_BASE_URL,  key: ALPACA_LIVE_API_KEY,  secret: ALPACA_LIVE_API_SECRET }
    : { baseUrl: ALPACA_PAPER_BASE_URL, key: ALPACA_PAPER_API_KEY, secret: ALPACA_PAPER_API_SECRET };

const getAlpacaHeaders = mode => {
  const c = getAlpacaConfig(mode);
  return { 'APCA-API-KEY-ID': c.key, 'APCA-API-SECRET-KEY': c.secret, 'Content-Type':'application/json' };
};

const avURL = (fn, sym='', extra='') =>
  `https://www.alphavantage.co/query?function=${fn}&symbol=${sym}${extra}&apikey=${ALPHA_VANTAGE_API_KEY}`;

/* Alpha Vantage throttled fetch (≈9 req/s) */
const delay  = ms => new Promise(r=>setTimeout(r,ms));
const fetchAV = async (sym, fn, extra='') => {
  await delay(110);
  const r = await fetch(avURL(fn,sym,extra));
  const j = await r.json();
  if (j.Note) throw new Error('AlphaVantage rate-limit');
  if (!r.ok) throw new Error(`AlphaVantage ${fn}:${sym} → ${r.status}`);
  return j;
};

/*────────────────────  Symbol cache (12 h)  ───────────────────*/
async function fetchAndCacheSymbols() {
  try {
    const stockCsv  = await (await fetch(avURL('LISTING_STATUS') + '&state=active')).text();
    const stocks    = stockCsv.split('\n').slice(1).filter(Boolean).map(l=>l.split(',')[0]);

    const cryptoCsv = await (await fetch(avURL('DIGITAL_CURRENCY_LIST'))).text();
    const cryptos   = cryptoCsv.split('\n').slice(1).filter(Boolean).map(l=>l.split(',')[0]);

    fs.writeFileSync(SYMBOL_CACHE_FILE, JSON.stringify([...stocks, ...cryptos]));
    console.log(`[Cache] Saved ${stocks.length+cryptos.length} symbols`);
  } catch (e) { console.error('[Cache] symbol fetch error:', e); }
}
fetchAndCacheSymbols();
cron.schedule('0 */12 * * *', fetchAndCacheSymbols);
const loadCached = () => {
  try { return JSON.parse(fs.readFileSync(SYMBOL_CACHE_FILE,'utf-8')); }
  catch { return []; }
};

/*────────────────────────  Helpers  ──────────────────────────*/
const analyzeSymbol = s => ({ symbol: s, score: Math.random(), strategy: 'momentum' });
async function executeTrade(symbol, strategy, qty, mode) {
  const cfg = getAlpacaConfig(mode);
  const r = await fetch(`${cfg.baseUrl}/v2/orders`, {
    method: 'POST', headers: getAlpacaHeaders(mode),
    body: JSON.stringify({ symbol, qty, side:'buy', type:'market', time_in_force:'day' })
  });
  if (!r.ok) throw new Error(`Alpaca order failed ${symbol}`);
  return r.json();
}

/*─────────────────────────  ROUTES  ──────────────────────────*/

// Health-check
app.get('/', (_req, res) => res.send('BullCircle backend up'));

/*——  Alpaca  ——*/
app.get('/api/account', async (req, res) => {
  const mode = req.query.mode === 'live' ? 'live' : 'paper';
  const base = getAlpacaConfig(mode).baseUrl;
  try {
    const [a, p, o] = await Promise.all([
      fetch(`${base}/v2/account`, { headers: getAlpacaHeaders(mode) }),
      fetch(`${base}/v2/positions`, { headers: getAlpacaHeaders(mode) }),
      fetch(`${base}/v2/orders?status=all&limit=10`, { headers: getAlpacaHeaders(mode) })
    ]);
    if (!a.ok || !p.ok || !o.ok) throw new Error('Alpaca fetch error');
    res.json({ account: await a.json(), positions: await p.json(), orders: await o.json() });
  } catch (e) { res.status(502).json({ error: e.message }); }
});

app.get('/api/account/history', async (req, res) => {
  const mode = req.query.mode === 'live' ? 'live' : 'paper';
  const base = getAlpacaConfig(mode).baseUrl;
  try {
    const r = await fetch(
      `${base}/v2/account/portfolio/history?period=1M&timeframe=1D`,
      { headers: getAlpacaHeaders(mode) }
    );
    if (!r.ok) throw new Error('history error');
    const j = await r.json();
    res.json({ history: j.timestamp.map((t, i) => ({ date: new Date(t*1000).toISOString().slice(0,10), equity: j.equity[i] })) });
  } catch (e) { res.status(502).json({ error: e.message }); }
});

/*——  Alpha-Vantage quotes / news / search  ——*/
app.get('/api/alpha-quotes', async (req, res) => {
  const syms = (req.query.symbols || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  if (!syms.length) return res.status(400).json({ error: 'symbols required' });
  try {
    const quotes = {};
    for (const s of syms) quotes[s] = (await fetchAV(s, 'GLOBAL_QUOTE'))['Global Quote'] || {};
    res.json({ quotes });
  } catch (e) { res.status(502).json({ error: e.message }); }
});

app.get('/api/crypto-quotes', async (req, res) => {
  const syms = (req.query.symbols || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  if (!syms.length) return res.status(400).json({ error: 'symbols required' });
  try {
    const quotes = {};
    for (const s of syms)
      quotes[s] = (await fetchAV(s, 'DIGITAL_CURRENCY_GLOBAL_QUOTE', '&market=USD'))['Digital Currency Global Quote'] || {};
    res.json({ quotes });
  } catch (e) { res.status(502).json({ error: e.message }); }
});

app.get('/api/alpha-history', async (req, res) => {
  const symbol = (req.query.symbol || '').toUpperCase();
  if (!symbol) return res.status(400).json({ error: 'symbol required' });
  try { res.json({ symbol, history: await getAlphaHistory(symbol) }); }
  catch { res.status(502).json({ error: 'history fetch failed' }); }
});

app.get('/api/alpha-news', async (_req, res) => {
  try {
    const feed = (await fetchAV('', 'NEWS_SENTIMENT')).feed || [];
    res.json({ news: feed.map(a => ({ title: a.title, summary: a.summary||a.body, url: a.url, datetime: a.time_published, source: a.source||a.provider })) });
  } catch { res.status(502).json({ error: 'news fetch failed' }); }
});

app.get('/api/alpha-search', async (req, res) => {
  const q = (req.query.query || '').trim();
  if (!q) return res.status(400).json({ error: 'query required' });
  try {
    const j = await fetchAV(q, 'SYMBOL_SEARCH', `&keywords=${encodeURIComponent(q)}`);
    res.json({ results: (j.bestMatches || []).map(m => ({ symbol: m['1. symbol'], name: m['2. name'], region: m['4. region'], currency: m['8. currency'] })) });
  } catch { res.status(502).json({ error: 'search failed' }); }
});

app.get('/api/alpha-listings', async (_req, res) => {
  try {
    const r = await fetch(avURL('LISTING_STATUS'));
    if (!r.ok) return res.status(r.status).send(await r.text());
    res.type('text/csv').send(await r.text());
  } catch { res.status(502).json({ error: 'listings failed' }); }
});

/*——  Chart helpers  ——*/
app.get('/api/chart-data', async (req, res) => {
  const symbol = (req.query.symbol || '').toUpperCase();
  const market = req.query.market === 'forex' ? 'forex' : 'stocks';
  if (!symbol) return res.status(400).json({ error: 'symbol required' });
  try {
    const fn = market === 'forex' ? 'FX_DAILY' : 'TIME_SERIES_DAILY';
    const key = market === 'forex' ? 'Time Series FX (Daily)' : 'Time Series (Daily)';
    const ts = (await fetchAV(symbol, fn))[key] || {};
    res.json({ bars: Object.keys(ts).sort().map(d => ({ t: d, o: +ts[d]['1. open'], h: +ts[d]['2. high'], l: +ts[d]['3. low'], c: +ts[d]['4. close'] })) });
  } catch { res.status(502).json({ error: 'chart fetch failed' }); }
});

app.get('/api/stock-data', async (req, res) => {
  const symbol = (req.query.symbol || '').toUpperCase();
  if (!symbol) return res.status(400).json({ error: 'symbol required' });
  try {
    const ts = (await fetchAV(symbol, 'TIME_SERIES_INTRADAY', '&interval=1min'))['Time Series (1min)'] || {};
    res.json({ bars: Object.keys(ts).sort().map(d => ({ t: d, o: +ts[d]['1. open'], h: +ts[d]['2. high'], l: +ts[d]['3. low'], c: +ts[d]['4. close'] })) });
  } catch { res.status(502).json({ error: 'stock fetch failed' }); }
});

/*——  Trading-bot helper routes  ——*/
app.get('/api/tradingbot/fullscan/init', (_req, res) => {
  try { const s = loadCached(); res.json({ count: s.length, symbols: s }); }
  catch { res.status(500).json({ error: 'symbol cache missing' }); }
});
app.get('/api/tradingbot/symbols', (_req, res) => res.json({ symbols: loadCached() }));

/* Quick GPT signal */
app.get('/api/tradingbot/signal', async (req, res) => {
  const symbol = (req.query.symbol || '').toUpperCase();
  if (!symbol) return res.status(400).json({ error: 'symbol required' });
  try {
    const q = await fetchAV(symbol, 'GLOBAL_QUOTE');
    const price = +q['Global Quote']['05. price'] || 0;
    if (!price) throw new Error('no price');
    const history = await getAlphaHistory(symbol);
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const raw = (await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: `You are TradeGPT. Stock ${symbol} $${price}. Reply YAML with signal,confidence,reason` }],
      temperature: 0, max_tokens: 100
    })).choices[0].message.content.trim();
    const pick = k => raw.match(new RegExp(`${k}:\\s*([^\\n]+)`, 'i'))?.[1].trim() || '';
    res.json({ symbol, price, history,
      signal: pick('signal').toLowerCase(), confidence: +pick('confidence') || 0, reason: pick('reason'), raw });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* Small journal */
const journal = [];
app.post('/api/tradingbot/journal', (req, res) => {
  const entry = { ...req.body, timestamp: new Date().toISOString() };
  journal.push(entry); res.json({ logged: true, entry });
});
app.get('/api/tradingbot/journal', (_req, res) => res.json({ count: journal.length, journal }));

/* Core analysis */
app.post('/api/tradingbot', async (req, res) => {
  const symbol = (req.body.symbol || '').toUpperCase();
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  try {
    const q       = await fetchAV(symbol, 'GLOBAL_QUOTE');
    const price   = +q['Global Quote']['05. price'];
    const history = await getAlphaHistory(symbol);
    const openai  = new OpenAI({ apiKey: OPENAI_API_KEY });
    const chat    = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: `Analyze ${symbol} at $${price}. Reply YAML with strategy,confidence,recommendation,analysis` }]
    });
    const raw = chat.choices[0].message.content.trim();
    function pick(key, fn = v => v) {
      const m = raw.match(new RegExp(`${key}:\s*([^\n]+)`, 'i'));
      return m ? fn(m[1].trim()) : fn('');
    }
    res.json({ symbol, price, history,
      strategy      : pick('strategy'),
      confidence    : pick('confidence',    v => parseInt(v, 10) || 0),
      recommendation: pick('recommendation', v => v.toLowerCase()),
      analysis      : pick('analysis'),
      raw
    });
  } catch (err) {
    console.error('core-analysis error:', err);
    res.status(500).json({ error: err.message });
  }
});

/* Autopilot (Python ML) */
app.post('/api/tradingbot/autopilot', async (req, res) => {
  const symbol = (req.body.symbol || '').toUpperCase();
  if (!symbol) return res.status(400).json({ error: 'symbol required' });
  const mode = req.body.mode === 'live' ? 'live' : 'paper';
  try {
    const q      = await fetchAV(symbol, 'GLOBAL_QUOTE');
    const price  = +q['Global Quote']['05. price'] || 0;
    const volume = +q['Global Quote']['06. volume'] || 0;
    const history = await getAlphaHistory(symbol);
    const script = path.join(process.cwd(), 'ml_model', 'predict_trade.py');
    const result = await new Promise((ok, fail) => {
      let out = '';
      const py = new PythonShell(script, { mode: 'text', pythonOptions: ['-u'] });
      py.on('message', m => out += m);
      py.end(err => err ? fail(err) : ok(JSON.parse(out)));
      py.send(JSON.stringify({ price, volume, history }));
    });
    let tradeResult = null;
    if (result.recommendation === 'buy' && result.confidence > 0.8) {
      tradeResult = await executeTrade(symbol, 'autopilot', 1, mode);
    }
    res.json({ symbol, price, volume, history, ...result, tradeResult });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/*────────────────────  Global error handler  ──────────────────*/
app.use((err, req, _res, _next) => {
  console.error('🔥', err);
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers',
             'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods',
             'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.status(/AlphaVantage|Alpaca/.test(err.message) ? 502 : 500)
     .json({ error: err.message });
});

/*──────────────────────  Start  ───────────────────────────────*/
app.listen(PORT, () => console.log(`🚀 BullCircle API listening on ${PORT}`));
