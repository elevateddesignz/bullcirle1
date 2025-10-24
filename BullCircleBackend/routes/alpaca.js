// routes/alpaca.ts
import express from 'express';
import axios from 'axios';
const router = express.Router();

router.get('/chart-data', async (req, res) => {
  const { symbol, timeframe, env = 'paper' } = req.query;

  const baseURL = env === 'live'
    ? process.env.ALPACA_LIVE_BASE_URL
    : process.env.ALPACA_PAPER_BASE_URL;

  const API_KEY = env === 'live'
    ? process.env.ALPACA_LIVE_API_KEY
    : process.env.ALPACA_PAPER_API_KEY;

  const API_SECRET = env === 'live'
    ? process.env.ALPACA_LIVE_API_SECRET
    : process.env.ALPACA_PAPER_API_SECRET;

  try {
    const url = `${baseURL}/v2/stocks/${symbol}/bars`;
    const response = await axios.get(url, {
      headers: {
        'APCA-API-KEY-ID': API_KEY,
        'APCA-API-SECRET-KEY': API_SECRET,
      },
      params: {
        timeframe,
        limit: 100,
      },
    });

    res.json(response.data);
  } catch (err) {
    console.error('❌ Alpaca API error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

export default router;
