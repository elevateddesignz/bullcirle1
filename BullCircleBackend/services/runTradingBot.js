// services/runTradingBot.js
import { getAlphaHistory }   from '../lib/alphaHistory.js';
import { fetchGlobalQuote }  from '../lib/alphaHelpers.js'; // your existing helper
import { calculateSignal }   from '../utils/indicators.js';
import { placeOrder }        from './placeOrder.js';

/**
 * Fetches price history, computes a signal, and (optionally) places an order.
 */
export async function runTradingBot(symbol, mode = 'paper') {
  // 1) history
  const history = await getAlphaHistory(symbol);
  if (history.length < 2) throw new Error('Not enough history');

  // 2) compute signal
  const { signal, strength } = calculateSignal(history);

  // 3) optionally trade if buy && strong
  let tradeResult = null;
  if (signal === 'buy' && strength > 10) {
    tradeResult = await placeOrder(symbol, 1, 'buy', mode);
  }

  return { symbol, signal, strength, tradeResult, history };
}
