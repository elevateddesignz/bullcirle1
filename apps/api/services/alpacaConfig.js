// services/alpacaConfig.js
import dotenv from 'dotenv';
dotenv.config();

export function getAlpacaConfig(mode = 'paper') {
  const {
    ALPACA_PAPER_API_KEY,
    ALPACA_PAPER_API_SECRET,
    ALPACA_PAPER_BASE_URL,
    ALPACA_LIVE_API_KEY,
    ALPACA_LIVE_API_SECRET,
    ALPACA_LIVE_BASE_URL
  } = process.env;

  return mode === 'live'
    ? { baseUrl: ALPACA_LIVE_BASE_URL, key: ALPACA_LIVE_API_KEY, secret: ALPACA_LIVE_API_SECRET }
    : { baseUrl: ALPACA_PAPER_BASE_URL, key: ALPACA_PAPER_API_KEY, secret: ALPACA_PAPER_API_SECRET };
}

export function getAlpacaHeaders(mode = 'paper') {
  const cfg = getAlpacaConfig(mode);
  return {
    'APCA-API-KEY-ID': cfg.key,
    'APCA-API-SECRET-KEY': cfg.secret,
    'Content-Type': 'application/json'
  };
}
