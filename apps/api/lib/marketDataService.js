import fetch from 'node-fetch';
const AV_API_KEY = process.env.ALPHAVANTAGE_API_KEY;

export async function fetchIntradaySeries(
  symbol,
  interval = '1min',
  outputSize = 'compact',
  points = 5
) {
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${symbol}` +
              `&interval=${interval}&outputsize=${outputSize}&apikey=${AV_API_KEY}`;
  const res = await fetch(url);
  const json = await res.json();
  const key = `Time Series (${interval})`;
  if (!json[key]) {
    throw new Error(json['Error Message'] || json['Note'] || 'Unexpected AV response');
  }
  const entries = Object.entries(json[key])
    .slice(0, points)
    .map(([time, vals]) => ({
      time,
      open:  parseFloat(vals['1. open']),
      high:  parseFloat(vals['2. high']),
      low:   parseFloat(vals['3. low']),
      close: parseFloat(vals['4. close']),
      volume: parseInt(vals['5. volume'], 10),
    }))
    .reverse();
  return entries;
}

export async function getMarketData(symbols) {
  const data = {};
  for (const sym of symbols) {
    try {
      data[sym] = await fetchIntradaySeries(sym);
    } catch (err) {
      console.error(`AlphaVantage error for ${sym}:`, err.message);
      data[sym] = [];
    }
    await new Promise(r => setTimeout(r, 15000)); // rate-limit
  }
  return data;
}
