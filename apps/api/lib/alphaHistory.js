// lib/alphaHistory.js
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const { ALPHA_VANTAGE_API_KEY } = process.env;
const delay = ms => new Promise(r => setTimeout(r, ms));
const avURL = (fn, sym = '', extra = '') =>
  `https://www.alphavantage.co/query?function=${fn}&symbol=${sym}${extra}&apikey=${ALPHA_VANTAGE_API_KEY}`;

/**
 * Fetches daily time-series data from Alpha Vantage and returns
 * an array of { date, open, high, low, close, volume } sorted ascending.
 */
export async function getAlphaHistory(symbol) {
  await delay(110);
  const res = await fetch(avURL('TIME_SERIES_DAILY', symbol));
  if (!res.ok) throw new Error(`history fetch failed: ${res.status}`);
  const json = await res.json();
  const series = json['Time Series (Daily)'] || {};
  return Object.keys(series)
    .sort()
    .map(date => ({
      date,
      open:   +series[date]['1. open'],
      high:   +series[date]['2. high'],
      low:    +series[date]['3. low'],
      close:  +series[date]['4. close'],
      volume: +series[date]['5. volume'],
    }));
}
