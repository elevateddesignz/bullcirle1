export const getQuotes = async (req, res) => {
  try {
    const mode = req.headers['x-env-mode'] || 'paper'; // default to paper

    const apiKey =
      mode === 'live'
        ? process.env.ALPACA_LIVE_API_KEY
        : process.env.ALPACA_PAPER_API_KEY;

    const apiSecret =
      mode === 'live'
        ? process.env.ALPACA_LIVE_API_SECRET
        : process.env.ALPACA_PAPER_API_SECRET;

    const baseUrl =
      mode === 'live'
        ? 'https://api.alpaca.markets'
        : 'https://paper-api.alpaca.markets';

    const symbols = ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN'];
    const quotes = {};

    for (const symbol of symbols) {
      const url = `${baseUrl}/v2/stocks/${symbol}/quotes/latest`;
      const response = await fetch(url, {
        headers: {
          'APCA-API-KEY-ID': apiKey,
          'APCA-API-SECRET-KEY': apiSecret,
        },
      });

      if (!response.ok) {
        console.error(`❌ Failed for ${symbol}: ${response.statusText}`);
        continue;
      }

      const data = await response.json();
      quotes[symbol] = data?.quote || null;
    }

    res.json({ quotes });
  } catch (error) {
    console.error('[❌ Alpaca Quote Error]', error.message);
    res.status(500).json({ error: 'Failed to fetch market quotes' });
  }
};
