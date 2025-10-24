import fetch from 'node-fetch';

export const getPortfolio = async (req, res) => {
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

    const response = await fetch(`${baseUrl}/v2/account`, {
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': apiSecret,
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('❌ Portfolio Fetch Error:', errText);
      return res.status(500).json({ error: 'Failed to fetch portfolio' });
    }

    const data = await response.json();
    res.json({
      portfolio_value: parseFloat(data?.portfolio_value || 0),
      cash: data?.cash,
      buying_power: data?.buying_power,
      ...data,
    });
  } catch (err) {
    console.error('❌ Portfolio Error:', err.message);
    res.status(500).json({ error: 'Unexpected error fetching portfolio' });
  }
};
