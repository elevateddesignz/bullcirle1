// src/utils/indicators.js

/**
 * A very simple momentum signal:
 *   if last close > average close → 'buy', else 'sell'
 * @param {Array<{ close: number }>} history
 * @returns {'buy'|'sell'}
 */
export default function calculateSignal(history) {
  if (!history.length) return 'hold';
  const closes = history.map(h => h.close);
  const avg    = closes.reduce((sum, x) => sum + x, 0) / closes.length;
  const last   = closes[closes.length - 1];
  return last > avg ? 'buy' : 'sell';
}
