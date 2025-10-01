// services/placeOrder.js
import fetch from 'node-fetch';
import { getAlpacaHeaders } from './alpacaConfig.js';

/**
 * Places a simple market order via Alpaca.
 */
export async function placeOrder(symbol, qty, side = 'buy', mode = 'paper') {
  const baseURL = getAlpacaHeaders(mode).__proto__.baseURL; // not used
  const headers = getAlpacaHeaders(mode);

  const res = await fetch(
    `${getAlpacaHeaders(mode).baseURL}/v2/orders`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        symbol,
        qty,
        side,
        type: 'market',
        time_in_force: 'gtc',
      }),
    }
  );
  if (!res.ok) {
    throw new Error(`Alpaca order failed: ${res.status}`);
  }
  return res.json();
}
