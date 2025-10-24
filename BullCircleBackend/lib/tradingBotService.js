import Alpaca from '@alpacahq/alpaca-trade-api';
import { getTradableSymbols } from './symbolScannerService.js';
import { getMarketData }       from './marketDataService.js';
import { fetchMarketNews }     from './newsService.js';
import { computeSignals }      from './strategy.js';
import { learningService }     from './learningService.js';

export async function runTradingStrategy(mode) {
  const alpaca = new Alpaca({
    keyId:    mode === 'live' 
                ? process.env.ALPACA_LIVE_API_KEY 
                : process.env.ALPACA_PAPER_API_KEY,
    secretKey:mode === 'live' 
                ? process.env.ALPACA_LIVE_API_SECRET 
                : process.env.ALPACA_PAPER_API_SECRET,
    paper:    mode === 'paper',
  });

  let symbols = await getTradableSymbols();
  symbols = symbols.slice(0, 30);

  const marketData = await getMarketData(symbols);
  const news       = await fetchMarketNews(symbols);
  let signals      = computeSignals(marketData, news);
  signals          = await learningService.adjustSignals(signals);

  const executed = [];
  for (const sig of signals) {
    try {
      const order = await alpaca.createOrder({
        symbol:        sig.symbol,
        qty:           sig.qty,
        side:          sig.side,
        type:          'market',
        time_in_force: 'gtc',
      });
      executed.push({ symbol: sig.symbol, side: sig.side, orderId: order.id });
    } catch (err) {
      executed.push({ symbol: sig.symbol, side: sig.side, error: err.message });
    }
  }

  await learningService.recordOutcome(signals, executed);

  return {
    mode,
    timestamp: new Date().toISOString(),
    signals,
    executed,
  };
}
