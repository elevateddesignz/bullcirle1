// utils/indicators.js

/**
 * A very simple example “signal” calculator. Replace this with
 * your real multi-strategy logic.
 *
 * @param {{ date: string, value: number }[]} history
 * @returns {{ signal: 'buy'|'sell'|'hold', strength: number }}
 */
export function calculateSignal(history) {
  if (history.length < 2) {
    return { signal: 'hold', strength: 0 };
  }
  const first = history[0].value;
  const last  = history[history.length - 1].value;
  const diff  = last - first;
  const pct   = Math.abs(diff) / first * 100;

  return {
    signal:   diff > 0 ? 'buy'  : diff < 0 ? 'sell' : 'hold',
    strength: Math.round(pct),
  };
}
