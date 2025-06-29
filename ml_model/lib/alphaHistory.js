import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_DIR = path.resolve(__dirname, '..', 'cache');
fs.mkdirSync(CACHE_DIR, { recursive: true });

/**
 * Fetches historical data for a symbol from Alpha Vantage
 * @param {string} symbol - Stock symbol
 * @returns {Promise<Array>} - Array of historical data points
 */
export async function getAlphaHistory(symbol) {
  const cacheFile = path.join(CACHE_DIR, `${symbol.toUpperCase()}_history.json`);
  
  // Check cache first
  try {
    if (fs.existsSync(cacheFile)) {
      const stats = fs.statSync(cacheFile);
      const cacheAge = Date.now() - stats.mtimeMs;
      
      // Cache is valid for 24 hours
      if (cacheAge < 24 * 60 * 60 * 1000) {
        const cachedData = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
        return cachedData;
      }
    }
  } catch (err) {
    console.warn(`Cache read error for ${symbol}:`, err);
  }
  
  // Fetch from Alpha Vantage
  try {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      throw new Error('ALPHA_VANTAGE_API_KEY not set in environment');
    }
    
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${apiKey}&outputsize=compact`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status}`);
    }
    
    const data = await response.json();
    const timeSeries = data['Time Series (Daily)'];
    
    if (!timeSeries) {
      throw new Error(`No data available for ${symbol}`);
    }
    
    // Convert to array format
    const history = Object.entries(timeSeries)
      .map(([date, values]) => ({
        date,
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
        volume: parseInt(values['5. volume'], 10)
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Cache the result
    try {
      fs.writeFileSync(cacheFile, JSON.stringify(history));
    } catch (err) {
      console.warn(`Cache write error for ${symbol}:`, err);
    }
    
    return history;
  } catch (error) {
    console.error(`Error fetching history for ${symbol}:`, error);
    
    // Return mock data as fallback
    const mockHistory = [];
    const today = new Date();
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Generate random price data
      const basePrice = 100 + Math.random() * 50;
      const volatility = 2 + Math.random() * 3;
      
      const open = basePrice + (Math.random() - 0.5) * volatility;
      const close = open + (Math.random() - 0.5) * volatility;
      const high = Math.max(open, close) + Math.random() * volatility;
      const low = Math.min(open, close) - Math.random() * volatility;
      const volume = Math.floor(100000 + Math.random() * 900000);
      
      mockHistory.push({
        date: date.toISOString().split('T')[0],
        open,
        high,
        low,
        close,
        volume
      });
    }
    
    return mockHistory;
  }
}