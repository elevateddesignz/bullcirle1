// tradingbot.js
import express from 'express';
import fs      from 'fs';
import path    from 'path';
import { runTradingBot } from './services/runTradingBot.js';

const router = express.Router();

router.post('/auto', async (req, res) => {
  const mode    = req.body.env === 'live' ? 'live' : 'paper';
  // load cached symbols
  const cacheFile = path.resolve(__dirname, 'cache', 'symbols-cache.json');
  const symbols   = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));

  try {
    const result = await runTradingBot(
      symbols,
      req.body.targetProfit,
      req.body.stopLossPct,
      req.body.takeProfitPct,
      mode
    );
    res.json(result);
  } catch (err) {
    console.error('auto-scan error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
