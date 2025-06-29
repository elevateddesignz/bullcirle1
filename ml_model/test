// index.js
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import fetch from 'node-fetch'
import { PythonShell } from 'python-shell'
import path from 'path'
import fs from 'fs'
import { getAlphaHistory } from './lib/alphaHistory.js'

// Load .env
dotenv.config()

// Constants & setup
const app = express()
const PORT = process.env.PORT || 3000
const CACHE_DIR = path.resolve('cache')
const SYMBOL_CACHE = path.join(CACHE_DIR, 'stockSymbols.json')
fs.mkdirSync(CACHE_DIR, { recursive: true })

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

// Helpers
const getAlpacaHeaders = (mode = 'paper') => ({
  'APCA-API-KEY-ID': process.env[`ALPACA_${mode.toUpperCase()}_API_KEY`],
  'APCA-API-SECRET-KEY': process.env[`ALPACA_${mode.toUpperCase()}_API_SECRET`],
  'Content-Type': 'application/json',
})

async function fetchGlobalQuote(symbol, fnName, extra = '') {
  const url = `https://www.alphavantage.co/query?function=${fnName}&symbol=${symbol}${extra}&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`AlphaVantage ${symbol} (${fnName}) failed: ${res.status}`)
  return res.json()
}

// ─── Root ───────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.send('BullCircle Backend is running!'))

// ─── Alpaca account & history ──────────────────────────────────────────
app.get('/api/account', async (req, res) => {
  const mode = req.query.mode === 'live' ? 'live' : 'paper'
  const base = process.env[`ALPACA_${mode.toUpperCase()}_BASE_URL`]
  try {
    const [acct, pos, ord] = await Promise.all([
      fetch(`${base}/v2/account`, { headers: getAlpacaHeaders(mode) }),
      fetch(`${base}/v2/positions`, { headers: getAlpacaHeaders(mode) }),
      fetch(`${base}/v2/orders?status=all&limit=10`, { headers: getAlpacaHeaders(mode) }),
    ])
    if (!acct.ok || !pos.ok || !ord.ok) throw new Error('Alpaca error')
    const [account, positions, orders] = await Promise.all([acct.json(), pos.json(), ord.json()])
    res.json({ account, positions, orders })
  } catch {
    res.status(502).json({ error: 'Failed to fetch Alpaca data' })
  }
})

app.get('/api/account/history', async (req, res) => {
  const mode = req.query.mode === 'live' ? 'live' : 'paper'
  const base = process.env[`ALPACA_${mode.toUpperCase()}_BASE_URL`]
  try {
    const url = `${base}/v2/account/portfolio/history?period=1M&timeframe=1D`
    const r = await fetch(url, { headers: getAlpacaHeaders(mode) })
    if (!r.ok) throw new Error('Alpaca history error')
    const j = await r.json()
    const history = j.timestamp.map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().slice(0, 10),
      value: j.equity[i],
    }))
    res.json({ history })
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

// ─── Alpha Vantage endpoints ────────────────────────────────────────────
app.get('/api/alpha-quotes', async (req, res) => {
  const syms = (req.query.symbols || '')
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean)
  if (!syms.length) return res.status(400).json({ error: 'Missing symbols' })

  try {
    const quotes = {}
    await Promise.all(syms.map(async s => {
      const j = await fetchGlobalQuote(s, 'GLOBAL_QUOTE')
      quotes[s] = j['Global Quote'] || {}
    }))
    res.json({ quotes })
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

app.get('/api/crypto-quotes', async (req, res) => {
  const syms = (req.query.symbols || '')
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean)
  if (!syms.length) return res.status(400).json({ error: 'Missing symbols' })

  try {
    const quotes = {}
    await Promise.all(syms.map(async s => {
      const j = await fetchGlobalQuote(s, 'DIGITAL_CURRENCY_GLOBAL_QUOTE', '&market=USD')
      quotes[s] = j['Digital Currency Global Quote'] || {}
    }))
    res.json({ quotes })
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

app.get('/api/alpha-history', async (req, res) => {
  const symbol = (req.query.symbol || '').toUpperCase()
  if (!symbol) return res.status(400).json({ error: 'Missing symbol' })
  try {
    const history = await getAlphaHistory(symbol)
    res.json({ symbol, history })
  } catch {
    res.status(502).json({ error: 'Failed to fetch history' })
  }
})

app.get('/api/alpha-news', async (req, res) => {
  try {
    const j = await fetchGlobalQuote('', 'NEWS_SENTIMENT')
    const feed = Array.isArray(j.feed) ? j.feed : []
    const news = feed.map(a => ({
      title: a.title || '',
      summary: a.summary || a.body || '',
      url: a.url,
      datetime: a.time_published,
      source: a.source || a.provider || '',
    }))
    res.json({ news })
  } catch {
    res.status(502).json({ error: 'Failed to fetch news' })
  }
})

app.get('/api/alpha-listings', async (req, res) => {
  try {
    const r = await fetch(`https://www.alphavantage.co/query?function=LISTING_STATUS&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`)
    if (!r.ok) return res.status(r.status).send(await r.text())
    res.type('text/csv').send(await r.text())
  } catch {
    res.status(502).json({ error: 'Failed to fetch listings' })
  }
})

app.get('/api/alpha-search', async (req, res) => {
  const q = (req.query.query || '').trim()
  if (!q) return res.status(400).json({ error: 'Missing query' })
  try {
    const j = await fetchGlobalQuote(q, 'SYMBOL_SEARCH', `&keywords=${encodeURIComponent(q)}`)
    const results = (j.bestMatches || []).map(m => ({
      symbol: m['1. symbol'],
      name: m['2. name'],
      region: m['4. region'],
      currency: m['8. currency'],
    }))
    res.json({ results })
  } catch {
    res.status(502).json({ error: 'Failed to search symbols' })
  }
})

// ─── Chart & Stock Data ────────────────────────────────────────────────
app.get('/api/chart-data', async (req, res) => {
  const { symbol, market } = req.query
  if (!symbol) return res.status(400).json({ error: 'Missing symbol' })
  try {
    let ts, mapFn
    if (market === 'forex') {
      ts = (await fetchGlobalQuote(symbol, 'FX_DAILY'))['Time Series FX (Daily)']
    } else {
      ts = (await fetchGlobalQuote(symbol, 'TIME_SERIES_DAILY'))['Time Series (Daily)']
    }
    mapFn = date => {
      const bar = ts[date]
      return {
        t: new Date(date).toISOString(),
        o: parseFloat(bar['1. open']),
        h: parseFloat(bar['2. high']),
        l: parseFloat(bar['3. low']),
        c: parseFloat(bar['4. close']),
      }
    }
    const bars = Object.keys(ts || {}).sort().map(mapFn)
    res.json({ bars })
  } catch {
    res.status(502).json({ error: 'Failed to fetch chart data' })
  }
})

app.get('/api/stock-data', async (req, res) => {
  const symbol = req.query.symbol
  if (!symbol) return res.status(400).json({ error: 'Missing symbol' })
  try {
    const ts = (await fetchGlobalQuote(symbol, 'TIME_SERIES_INTRADAY', '&interval=1min'))['Time Series (1min)']
    const bars = Object.keys(ts || {}).sort().map(d => ({
      t: new Date(d).toISOString(),
      o: parseFloat(ts[d]['1. open']),
      h: parseFloat(ts[d]['2. high']),
      l: parseFloat(ts[d]['3. low']),
      c: parseFloat(ts[d]['4. close']),
    }))
    res.json({ bars })
  } catch {
    res.status(502).json({ error: 'Failed to fetch stock data' })
  }
})

// ─── Full‐Scan Init ────────────────────────────────────────────────────────
// Returns the full list of symbols in cache (plus count)
app.get('/api/tradingbot/fullscan/init', (req, res) => {
  try {
    const allSymbols = JSON.parse(fs.readFileSync(SYMBOL_CACHE, 'utf-8'))
    res.json({
      count: allSymbols.length,
      symbols: allSymbols
    })
  } catch (err) {
    console.error('❌ /api/tradingbot/fullscan/init error:', err)
    res.status(500).json({ error: 'Failed to load symbol cache' })
  }
})
// ─── Get Trading Signal ───────────────────────────────────────────────
// GET  /api/tradingbot/signal?symbol=XYZ
app.get('/api/tradingbot/signal', async (req, res) => {
  const symbol = (req.query.symbol || '').toString().toUpperCase();
  if (!symbol) return res.status(400).json({ error: 'Missing symbol parameter' });

  try {
    // 1️⃣ Fetch latest price
    const quoteJson = await fetchGlobalQuote(symbol, 'GLOBAL_QUOTE');
    const price     = parseFloat(quoteJson['Global Quote']?.['05. price'] || '0');
    if (!price) throw new Error(`No price available for ${symbol}`);

    // 2️⃣ Fetch 5-day history
    const history = await getAlphaHistory(symbol);

    // 3️⃣ Ask GPT for a signal
    const { default: OpenAI } = await import('openai');
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'Missing OPENAI_API_KEY' });
    }
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = `
You are TradeGPT, a professional equities analyst.
Stock: ${symbol}
Current Price: $${price.toFixed(2)}

Based on recent price history, provide a trading signal in YAML:
signal: <buy|sell|hold>
confidence: <0-100>
reason: <one short sentence>
`.trim();

    const chat = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 100,
    });

    const raw = chat.choices[0].message.content.trim();
    const pick = key =>
      raw.match(new RegExp(`${key}:\\s*([^\\n]+)`, 'i'))?.[1].trim() || '';

    res.json({
      symbol,
      price,
      history,
      signal: pick('signal')?.toLowerCase(),
      confidence: parseInt(pick('confidence'), 10) || 0,
      reason: pick('reason'),
      raw,
    });
  } catch (err) {
    console.error('❌ /api/tradingbot/signal error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Symbol List ─────────────────────────────────────────────────────────
// Returns the full list of symbols in cache
app.get('/api/tradingbot/symbols', (req, res) => {
    try {
      const allSymbols = JSON.parse(fs.readFileSync(SYMBOL_CACHE, 'utf-8'))
      res.json({ symbols: allSymbols })
    } catch (err) {
      console.error('❌ /api/tradingbot/symbols error:', err)
      res.status(500).json({ error: 'Failed to load symbol cache' })
    }
  })
  
// ─── TradingBot journal & endpoints ─────────────────────────────────────
const journal = []
app.post('/api/tradingbot/journal', (req, res) => {
  const entry = { ...req.body, timestamp: new Date().toISOString() }
  journal.push(entry)
  res.json({ status: 'logged', entry })
})
app.get('/api/tradingbot/journal', (_, res) => res.json({ count: journal.length, journal }))

app.post('/api/tradingbot', async (req, res) => {
  const symbol = (req.body.symbol || '').toUpperCase()
  if (!symbol) return res.status(400).json({ error: 'symbol required' })
  try {
    // price + history
    const j = await fetchGlobalQuote(symbol, 'GLOBAL_QUOTE')
    const price = parseFloat(j['Global Quote']['05. price'])
    if (!isFinite(price)) throw new Error('no price')
    const history = await getAlphaHistory(symbol)
    // GPT
    const { default: OpenAI } = await import('openai')
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const prompt = req.body.prompt
      ? `Analyze ${symbol} ($${price}) using:\n${req. body.prompt}`
      : `You are TradeGPT…\nStock: ${symbol}\nPrice: $${price}\nRespond in YAML…`
    const chat = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role:'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 180
    })
    const raw = chat.choices[0].message.content || ''
    const pick = key => (raw.match(new RegExp(`${key}:\\s*(.+)`, 'i')) || [])[1]?.trim() || ''
    res.json({
      symbol,
      price,
      strategy: pick('strategy') || 'unknown',
      confidence: parseInt(pick('confidence')) || 0,
      recommendation: (pick('recommendation') || 'wait').toLowerCase(),
      analysis: pick('analysis'),
      history,
      raw
    })
  } catch (err) {
    console.error('/api/tradingbot error', err)
    res.status(502).json({ error: err.message })
  }
})

app.get('/api/tradingbot/topplays', async (req, res) => {
  const market = req.query.market === 'crypto' ? 'crypto' : 'stocks'
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 20)
  const universe = market === 'crypto'
    ? ['BTC','ETH','SOL','XRP','ADA','DOGE','AVAX','DOT','MATIC','BNB']
    : ['AAPL','MSFT','NVDA','TSLA','AMZN','META','GOOGL','AMD','NFLX','JPM']
  try {
    const quotes = await Promise.all(universe.map(async s => {
      const fn = market === 'crypto' ? 'DIGITAL_CURRENCY_GLOBAL_QUOTE' : 'GLOBAL_QUOTE'
      const extra = market==='crypto'? '&market=USD':''
      const j = await fetchGlobalQuote(s, fn, extra)
      const obj = market==='crypto'? j['Digital Currency Global Quote'] : j['Global Quote']
      return {
        symbol: s,
        price: parseFloat(obj['05. price'] || obj['05. price (USD)'] || 0),
        change: parseFloat((obj['10. change percent'] || '').replace('%',''))
      }
    }))
    const ranked = quotes.filter(q => isFinite(q.change)).sort((a,b)=>b.change-a.change).slice(0,limit)
    const { default: OpenAI } = await import('openai')
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const p = `Angle (≤15 w) as JSON:\n${ranked.map(r=>`- ${r.symbol} (${r.change.toFixed(2)}%)`).join('\n')}`
    const chat = await openai.chat.completions.create({
      model:'gpt-3.5-turbo',
      messages:[{role:'user',content:p}],
      temperature:0.6,max_tokens:150
    })
    let angles = []
    try { angles = JSON.parse(chat.choices[0].message.content) } catch{}
    const plays = ranked.map(r => ({
      ...r,
      angle: angles.find(a=>a.symbol===r.symbol)?.angle || ''
    }))
    res.json({ market, plays })
  } catch (err) {
    console.error('topplays error', err)
    res.status(502).json({ error: err.message })
  }
})

app.get('/api/tradingbot/plays', async (req, res) => {
  const market = req.query.market === 'crypto' ? 'crypto' : 'stocks'
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 25)
  const universe = market === 'crypto'
    ? ['BTC','ETH','SOL','XRP','ADA','DOGE','AVAX','LINK','LTC','MATIC']
    : ['AAPL','MSFT','TSLA','NVDA','AMD','GOOGL','AMZN','META','NFLX','CRM']
  try {
    const quotes = await Promise.all(universe.map(async s => {
      const j = await fetchGlobalQuote(s, market==='crypto'?'DIGITAL_CURRENCY_GLOBAL_QUOTE':'GLOBAL_QUOTE', market==='crypto'? '&market=USD':'')
      const obj = market==='crypto'? j['Digital Currency Global Quote']: j['Global Quote']
      const change = parseFloat((obj['10. change percent']||'0').replace('%',''))
      return { symbol:s, price: parseFloat(obj['05. price']||obj['05. price (USD)']||0), change }
    }))
    const gainers = quotes.filter(q=>q.change>0).sort((a,b)=>b.change-a.change).slice(0,limit)
    const losers  = quotes.filter(q=>q.change<0).sort((a,b)=>a.change-b.change).slice(0,limit)
    res.json({ market, gainers, losers })
  } catch (err) {
    console.error('plays error', err)
    res.status(502).json({ error: err.message })
  }
})

app.post('/api/tradingbot/promptscan', async (req, res) => {
  const prompt = (req.body.prompt||'').trim()
  if (!prompt) return res.status(400).json({ error: 'prompt required' })
  try {
    const symbols = JSON.parse(fs.readFileSync(SYMBOL_CACHE,'utf-8')).slice(0,200)
    const quotes = []
    for (const s of symbols) {
      const j = await fetchGlobalQuote(s, 'GLOBAL_QUOTE').catch(()=>null)
      const price = parseFloat(j?.['Global Quote']?.['05. price']||NaN)
      const change = parseFloat((j?.['Global Quote']?.['10. change percent']||'0').replace('%',''))
      if (isFinite(price)) quotes.push({ symbol:s, price, change })
      await new Promise(r=>setTimeout(r,850))
    }
    const top5 = quotes.sort((a,b)=>b.change-a.change).slice(0,5)
    const summary = `User prompt: "${prompt}"\nPick best from:\n${top5.map(t=>`${t.symbol}: $${t.price.toFixed(2)} (${t.change.toFixed(2)}%)`).join('\n')}\nRespond YAML.`
    const { default: OpenAI } = await import('openai')
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const chat = await openai.chat.completions.create({
      model:'gpt-3.5-turbo',
      messages:[{role:'user',content:summary}],
      temperature:0.7,max_tokens:200
    })
    const raw = chat.choices[0].message.content||''
    const pick = k=> (raw.match(new RegExp(`${k}:\\s*(.+)`, 'i'))||[])[1]?.trim()||''
    res.json({
      raw,
      top: top5,
      symbol: pick('symbol'),
      strategy: pick('strategy'),
      confidence: parseInt(pick('confidence'))||0,
      recommendation: pick('recommendation'),
      analysis: pick('analysis'),
    })
  } catch (err) {
    console.error('promptscan error', err)
    res.status(502).json({ error: err.message })
  }
});
app.post('/api/tradingbot/autopilot', async (req, res) => {
  const symbol = (req.body.symbol||'').toUpperCase()
  if (!symbol) return res.status(400).json({ error: 'symbol required' })
  const mode = req.body.mode==='live'?'live':'paper'
  const base = process.env[`ALPACA_${mode.toUpperCase()}_BASE_URL`]
  try {
    const j = await fetchGlobalQuote(symbol, 'GLOBAL_QUOTE')
    const quote = j['Global Quote']||{}
    const price = parseFloat(quote['05. price']||0)
    const volume= parseInt(quote['06. volume']||0,10)
    if (!price||!volume) throw new Error('invalid quote')
    const features = { rsi:30+Math.random()*40, macd:(Math.random()-0.5)*0.1, volume }
    const result = await new Promise((resolve,reject)=>{
      let out=''
      const pys = new PythonShell(path.join(process.cwd(),'ml_model','predict_trade.py'),{mode:'text',pythonOptions:['-u']})
      pys.on('message',m=>out+=m)
      pys.end(err=>err?reject(err):resolve(JSON.parse(out)))
      pys.send(JSON.stringify(features))
    })
    let tradeResult=null
    if (result.recommendation==='buy'&&result.confidence>0.8) {
      const order={symbol,side:'buy',type:'market',time_in_force:'gtc',qty:1}
      const exec=await fetch(`${base}/v2/orders`,{method:'POST',headers:getAlpacaHeaders(mode),body:JSON.stringify(order)})
      if (!exec.ok) throw new Error('order failed')
      tradeResult=await exec.json()
    }
    res.json({ symbol, price, features, ...result, tradeResult })
  } catch (err) {
    console.error('autopilot error', err)
    res.status(502).json({ error: err.message })
  }
})

// ─── Start ────────────────────────────────────────────────────────────────
app.listen(PORT, () => console.log(`🚀 Listening on port ${PORT}`))
