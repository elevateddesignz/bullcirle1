import express from 'express';
const app = express();
const port = process.env.PORT || 3000;

const defaultStocks = ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'AMD'];

/**
 * Generates random ticker data for stocks.
 * @returns {Array<{symbol: string, price: number, change: number}>}
 */
function generateTickerData() {
  return defaultStocks.map(symbol => {
    const price = Math.random() * 1000 + 100; // Random price between 100 and 1100
    const change = (Math.random() - 0.5) * 10; // Random change between -5 and 5
    return { symbol, price: parseFloat(price.toFixed(2)), change: parseFloat(change.toFixed(2)) };
  });
}

/**
 * Generates sample daily candle data for the past 60 days.
 * Returns an object with arrays for t (timestamp), o (open), h (high), l (low), c (close), and v (volume).
 */
function generateCandleData() {
  const count = 60;
  const data = [];
  let currentTime = Math.floor(Date.now() / 1000) - count * 86400; // UNIX timestamp in seconds
  let currentPrice = Math.random() * 1000 + 100;
  for (let i = 0; i < count; i++) {
    const open = currentPrice;
    const change = (Math.random() - 0.5) * 10;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * 5;
    const low = Math.min(open, close) - Math.random() * 5;
    const volume = Math.floor(Math.random() * 1000000) + 50000;
    data.push({ t: currentTime, o: open, h: high, l: low, c: close, v: volume });
    currentPrice = close;
    currentTime += 86400;
  }
  return {
    s: "ok",
    t: data.map(item => item.t),
    o: data.map(item => parseFloat(item.o.toFixed(2))),
    h: data.map(item => parseFloat(item.h.toFixed(2))),
    l: data.map(item => parseFloat(item.l.toFixed(2))),
    c: data.map(item => parseFloat(item.c.toFixed(2))),
    v: data.map(item => item.v)
  };
}

// Endpoint for ticker data
app.get('/api/ticker', (req, res) => {
  const ticker = generateTickerData();
  res.json({ stocks: ticker });
});

// Endpoint for daily candle data for a given symbol
app.get('/api/stock/:symbol/candle', (req, res) => {
  // For demonstration, we ignore req.params.symbol and return generated candle data.
  const candleData = generateCandleData();
  res.json(candleData);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
