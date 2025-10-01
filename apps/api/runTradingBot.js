// services/runTradingBot.js

import { placeOrder } from './placeOrder.js';
import { getAlphaHistory } from '../src/utils/fetchAssetData.ts;
import { calculateSignal }  from '../src/utils/indicators.ts;

/**
 * @typedef {{ symbol: string; pct: number; strategy: string; qty: number }} TradeSignal
 * @typedef {{ scanned: number; top: TradeSignal[]; executed: { symbol: string; strategy: string; qty: number }[] }} BotResult
 */

/**
 * Run the trading bot: scan symbols, pick top 10, place orders.
 *
 * @param {string[]} symbols
 * @param {number} targetProfit
 * @param {number} stopLossPct
 * @param {number} takeProfitPct
 * @param {'paper'|'live'} mode
 * @returns {Promise<BotResult>}
 */
export async function runTradingBot(
  symbols,
  targetProfit,
  stopLossPct,
  takeProfitPct,
  mode
) {
  const signals = [];

  // 1) scan
  for (const symbol of symbols) {
    try {
      const history = await getAlphaHistory(symbol);
      const { pct, strategy } = calculateSignal(history);
      const price = history[history.length - 1].c;
      const qty   = Math.max(1, Math.floor(targetProfit / price));
      signals.push({ symbol, pct, strategy, qty });
    } catch (err) {
      console.warn(`scan error for ${symbol}:`, err);
    }
  }

  // 2) pick top 10
  signals.sort((a, b) => b.pct - a.pct);
  const top10 = signals.slice(0, 10);

  // 3) execute
  const executed = [];
  for (const { symbol, strategy, qty } of top10) {
    try {
      await placeOrder(symbol, qty, mode, { stopLossPct, takeProfitPct });
      executed.push({ symbol, strategy, qty });
    } catch (err) {
      console.error(`order failed for ${symbol}:`, err);
    }
  }

  // 4) return summary
  return {
    scanned:  symbols.length,
    top:      top10,
    executed,
  };
}
