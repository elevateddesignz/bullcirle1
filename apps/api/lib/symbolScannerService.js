import Alpaca from '@alpacahq/alpaca-trade-api';

let cachedSymbols = null;

export async function getTradableSymbols() {
  if (cachedSymbols) return cachedSymbols;

  const client = new Alpaca({
    keyId:   process.env.ALPACA_PAPER_API_KEY,
    secretKey: process.env.ALPACA_PAPER_API_SECRET,
    paper:   true,
  });

  const assets = await client.getAssets({ status: 'active', asset_class: 'us_equity' });
  cachedSymbols = assets
    .filter(a => a.tradable && a.exchange === 'NASDAQ')
    .map(a => a.symbol);

  return cachedSymbols;
}
