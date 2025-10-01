import { runTradingStrategy } from './tradingBotService.js';
import Alpaca from '@alpacahq/alpaca-trade-api';

let intervalHandle = null;
let logCallbacks = [];
let currentMode = 'paper';
let targetAmount = Infinity;
let minimumAmount = 0;

export function startAutoPilot(minutes, mode, goal, floor, onLog) {
  if (intervalHandle) clearInterval(intervalHandle);

  currentMode   = mode;
  targetAmount  = goal;
  minimumAmount = floor;
  logCallbacks.push(onLog);

  runIteration();
  intervalHandle = setInterval(runIteration, minutes * 60 * 1000);

  async function runIteration() {
    const timestamp = new Date().toISOString();
    let entry = `Autopilot (${currentMode}) tick at ${timestamp}`;

    try {
      // 1. check account equity
      const client = new Alpaca({
        keyId:    mode === 'live' 
                    ? process.env.ALPACA_LIVE_API_KEY  
                    : process.env.ALPACA_PAPER_API_KEY,
        secretKey:mode === 'live' 
                    ? process.env.ALPACA_LIVE_API_SECRET 
                    : process.env.ALPACA_PAPER_API_SECRET,
        paper:    mode === 'paper',
      });
      const account = await client.getAccount();
      const equity  = Number(account.equity);
      entry += ` | Equity: \$${equity.toFixed(2)}`;

      // 2. threshold check
      if (equity >= targetAmount) {
        entry += ` → 🎯 TARGET reached (\$${targetAmount}), stopping.`;
        logCallbacks.forEach(cb => cb(entry));
        stopAutoPilot();
        return;
      }
      if (equity <= minimumAmount) {
        entry += ` → ⚠️ MINIMUM breached (\$${minimumAmount}), stopping.`;
        logCallbacks.forEach(cb => cb(entry));
        stopAutoPilot();
        return;
      }

      // 3. run your trading logic
      const result = await runTradingStrategy(currentMode);
      entry += ` → Strategy result: ${JSON.stringify(result)}`;

    } catch (err) {
      entry += ` → ERROR: ${err.message}`;
    }

    logCallbacks.forEach(cb => cb(entry));
  }
}

export function stopAutoPilot() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  logCallbacks = [];
}
