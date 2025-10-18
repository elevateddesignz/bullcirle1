import { Router } from 'express';
import fetch from 'node-fetch';
import { PythonShell } from 'python-shell';
import path from 'path';
import OpenAI from 'openai';
import { getAlphaHistory } from '../lib/alphaHistory.js';
import { logger } from '../lib/logger.js';
import { refreshTokenIfNeeded } from '../lib/alpaca.js';
import { createPerUserRateLimiter } from '../middleware/rate-limit.js';
import { recordTradeAudit } from '../utils/trade-audit.js';

const router = Router();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const tradeRateLimiter = createPerUserRateLimiter();

function avURL(func: string, symbol = '', extra = '') {
  return `https://www.alphavantage.co/query?function=${func}&symbol=${symbol}${extra}&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchAV(symbol: string, func: string, extra = '') {
  await delay(110);
  const response = await fetch(avURL(func, symbol, extra));
  const json = await response.json();
  if ((json as any).Note) throw new Error('AlphaVantage rate-limit');
  if (!response.ok) throw new Error(`AlphaVantage ${func}:${symbol} → ${response.status}`);
  return json;
}

const tradingJournal: any[] = [];

router.get('/signal', async (req, res) => {
  const symbol = (req.query.symbol as string || '').toUpperCase();
  if (!symbol) return res.status(400).json({ error: 'symbol required' });
  try {
    const quote = await fetchAV(symbol, 'GLOBAL_QUOTE');
    const price = +quote['Global Quote']['05. price'] || 0;
    if (!price) throw new Error('no price');
    const history = await getAlphaHistory(symbol);
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: `You are TradeGPT. Stock ${symbol} $${price}. Reply YAML with signal,confidence,reason` }],
      temperature: 0,
      max_tokens: 100,
    });
    const raw = completion.choices[0].message.content?.trim() ?? '';
    const pick = (key: string) => raw.match(new RegExp(`${key}:\\s*([^\\n]+)`, 'i'))?.[1].trim() ?? '';
    res.json({
      symbol,
      price,
      history,
      signal: pick('signal').toLowerCase(),
      confidence: Number(pick('confidence') || 0),
      reason: pick('reason'),
      raw,
    });
  } catch (error) {
    logger.error({ err: error }, 'Trading signal failed');
    res.status(500).json({ error: error instanceof Error ? error.message : 'signal failed' });
  }
});

router.post('/journal', (req, res) => {
  const entry = { ...req.body, timestamp: new Date().toISOString() };
  tradingJournal.push(entry);
  res.json({ logged: true, entry });
});

router.get('/journal', (_req, res) => {
  res.json({ count: tradingJournal.length, journal: tradingJournal });
});

router.post('/', async (req, res) => {
  const symbol = (req.body.symbol as string || '').toUpperCase();
  if (!symbol) return res.status(400).json({ error: 'symbol required' });
  try {
    const quote = await fetchAV(symbol, 'GLOBAL_QUOTE');
    const price = +quote['Global Quote']['05. price'];
    const history = await getAlphaHistory(symbol);
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const chat = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: `Analyze ${symbol} at $${price}. Reply YAML with strategy,confidence,recommendation,analysis` }],
    });
    const raw = chat.choices[0].message.content?.trim() ?? '';
    const pick = (key: string, transform: (value: string) => any = value => value) => {
      const match = raw.match(new RegExp(`${key}:\\s*([^\\n]+)`, 'i'));
      return match ? transform(match[1].trim()) : transform('');
    };
    res.json({
      symbol,
      price,
      history,
      strategy: pick('strategy'),
      confidence: pick('confidence', value => parseInt(value, 10) || 0),
      recommendation: pick('recommendation', value => value.toLowerCase()),
      analysis: pick('analysis'),
      raw,
    });
  } catch (error) {
    logger.error({ err: error }, 'Trading analysis failed');
    res.status(500).json({ error: error instanceof Error ? error.message : 'analysis failed' });
  }
});

router.post('/autopilot', tradeRateLimiter, async (req, res) => {
  const symbol = (req.body.symbol as string || '').toUpperCase();
  if (!symbol) return res.status(400).json({ error: 'symbol required' });
  const env = req.body.mode === 'live' ? 'live' : 'paper';
  const auth = req.auth;
  if (!auth) {
    return res.status(401).json({ error: 'authentication required' });
  }

  try {
    const quote = await fetchAV(symbol, 'GLOBAL_QUOTE');
    const price = +quote['Global Quote']['05. price'] || 0;
    const volume = +quote['Global Quote']['06. volume'] || 0;
    const history = await getAlphaHistory(symbol);

    const script = path.join(process.cwd(), 'ml_model', 'predict_trade.py');
    const result = await new Promise<{ recommendation: string; confidence: number }>((resolve, reject) => {
      let output = '';
      const py = new PythonShell(script, { mode: 'text', pythonOptions: ['-u'] });
      py.on('message', message => {
        output += message;
      });
      py.end(error => {
        if (error) return reject(error);
        try {
          resolve(JSON.parse(output));
        } catch (parseError) {
          reject(parseError);
        }
      });
      py.send(JSON.stringify({ price, volume, history }));
    });

    let tradeResult = null;
    if (result.recommendation === 'buy' && result.confidence > 0.8) {
      tradeResult = await refreshTokenIfNeeded(auth.userId, env, client =>
        client.post('/v2/orders', {
          symbol,
          qty: 1,
          side: 'buy',
          type: 'market',
          time_in_force: 'day',
        })
      );
      await recordTradeAudit({
        userId: auth.userId,
        env,
        action: 'alpaca.order.autopilot',
        status: 'success',
        requestPayload: {
          symbol,
          recommendation: result.recommendation,
          confidence: result.confidence,
        },
        responsePayload: tradeResult.data,
      });
    }

    res.json({ symbol, price, volume, history, ...result, tradeResult: tradeResult?.data ?? null });
  } catch (error) {
    logger.error({ err: error }, 'Autopilot trade failed');
    await recordTradeAudit({
      userId: auth.userId,
      env,
      action: 'alpaca.order.autopilot',
      status: 'error',
      requestPayload: {
        symbol,
        mode: env,
      },
      error,
    });
    res.status(500).json({ error: error instanceof Error ? error.message : 'autopilot failed' });
  }
});

export default router;
