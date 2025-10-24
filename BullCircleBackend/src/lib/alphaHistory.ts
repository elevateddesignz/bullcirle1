import fetch from 'node-fetch';

const { ALPHA_VANTAGE_API_KEY } = process.env;
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const avURL = (fn: string, sym = '', extra = '') =>
  `https://www.alphavantage.co/query?function=${fn}&symbol=${sym}${extra}&apikey=${ALPHA_VANTAGE_API_KEY}`;

export interface AlphaBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function getAlphaHistory(symbol: string): Promise<AlphaBar[]> {
  await delay(110);
  const res = await fetch(avURL('TIME_SERIES_DAILY', symbol));
  if (!res.ok) throw new Error(`history fetch failed: ${res.status}`);
  const json = (await res.json()) as any;
  const series = json['Time Series (Daily)'] || {};
  return Object.keys(series)
    .sort()
    .map(date => ({
      date,
      open: Number(series[date]['1. open']),
      high: Number(series[date]['2. high']),
      low: Number(series[date]['3. low']),
      close: Number(series[date]['4. close']),
      volume: Number(series[date]['5. volume']),
    }));
}
