// src/components/StockTicker.tsx
import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, ChevronDown } from 'lucide-react';
import { useSearch } from '../contexts/SearchContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';

interface TickerItem {
  symbol: string;
  price: number;
  change: number;
  previousClose?: number;
}

const defaultStocks = ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'AMD'];
const defaultCryptos = ['BTCUSD', 'ETHUSD', 'XRPUSD', 'LTCUSD', 'BCHUSD'];
const defaultForex = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD'];

export default function StockTicker() {
  const [selectedMarket, setSelectedMarket] = useState<'stocks' | 'crypto' | 'forex'>('stocks');
  const [tickerData, setTickerData] = useState<TickerItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { handleSymbolSelect } = useSearch();
  const { theme } = useTheme();
  const navigate = useNavigate();

  // Return default symbols by market.
  const getDefaultSymbols = (market: string): string[] => {
    if (market === 'stocks') return defaultStocks;
    if (market === 'crypto') return defaultCryptos;
    if (market === 'forex') return defaultForex;
    return [];
  };

  // Watchlist state persists until the user removes symbols.
  const [watchlist, setWatchlist] = useState<string[]>(getDefaultSymbols(selectedMarket));
  const [inputValue, setInputValue] = useState<string>(watchlist.join(','));
  const [showWatchlist, setShowWatchlist] = useState<boolean>(false);

  // Global theme–based styling.
  const containerBg = theme === 'dark' ? 'bg-gray-900/95' : 'bg-white/95';
  const textColor = theme === 'dark' ? 'text-white' : 'text-gray-900';

  // Use Vite env variables.
  const backendUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL;
  if (!backendUrl) throw new Error('Missing backend URL environment variable');

  // Fetch market data from your backend.
  useEffect(() => {
    setError(null);

    async function fetchMarketData() {
      try {
        const symbols = watchlist.join(',');
        let url = '';
        if (selectedMarket === 'forex') {
          url = `${backendUrl}/api/alpha-forex?symbols=${encodeURIComponent(symbols)}`;
        } else {
          url = `${backendUrl}/api/alpha-quotes?symbols=${encodeURIComponent(symbols)}`;
        }
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const data = await response.json();

        const newTickerData = watchlist.map((symbol) => {
          const quote = data.quotes[symbol];
          if (quote) {
            if (selectedMarket === 'forex') {
              // For Forex, the backend already returns the exchange data object.
              const price = parseFloat(quote["5. Exchange Rate"]);
              return { symbol, price, previousClose: price, change: 0 };
            } else {
              const price = parseFloat(quote["05. price"]);
              const previousClose = parseFloat(quote["08. previous close"]);
              const change = parseFloat(quote["09. change"]);
              return { symbol, price, previousClose, change };
            }
          }
          return { symbol, price: 0, previousClose: 0, change: 0 };
        });
        setTickerData(newTickerData);
      } catch (err) {
        console.error("Error fetching market data:", err);
        setError("Error fetching market data");
      }
    }

    // Fetch immediately and then every 30 seconds.
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 30000);
    return () => clearInterval(interval);
  }, [backendUrl, watchlist, selectedMarket]);

  // Update the watchlist based on the input value.
  const handleWatchlistUpdate = () => {
    const symbols = inputValue
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length > 0);
    setWatchlist(symbols);
  };

  // Remove a symbol from the watchlist.
  const removeSymbol = (symbolToRemove: string) => {
    setWatchlist((prev) => prev.filter((symbol) => symbol !== symbolToRemove));
  };

  // Render each ticker item as a clickable button.
  const renderTickerItem = (item: TickerItem, index: number) => {
    const isUp = item.change >= 0;
    return (
      <button
        key={`${item.symbol}-${index}`}
        onClick={() => {
          // Navigate to the trade page with the selected symbol.
          navigate(`/trade?symbol=${item.symbol}`);
        }}
        className="inline-flex items-center gap-3 px-4 py-1.5 rounded-lg mx-1 border border-brand-primary/10 hover:border-brand-primary/30 hover:bg-brand-primary/5 transition-all"
      >
        <span className={`font-medium text-sm ${textColor}`}>{item.symbol}</span>
        <span className={`text-sm font-semibold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
          ${item.price.toFixed(2)}
        </span>
        <span className={`inline-flex items-center gap-1 text-xs font-medium ${isUp ? 'text-green-400' : 'text-red-400'}`}>
          {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(item.change).toFixed(2)}%
        </span>
      </button>
    );
  };

  return (
    <div className={`${containerBg} border-b border-brand-primary/20`}>
      <div className="h-12 flex items-center">
        <div className="flex items-center px-4 border-r border-brand-primary/20">
          <div className="relative group">
            <button
              className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              onClick={() => {
                // Toggle between markets (stocks, crypto, forex) and update defaults.
                const newMarket =
                  selectedMarket === 'stocks'
                    ? 'crypto'
                    : selectedMarket === 'crypto'
                    ? 'forex'
                    : 'stocks';
                setSelectedMarket(newMarket);
                const defaults = getDefaultSymbols(newMarket);
                setWatchlist(defaults);
                setInputValue(defaults.join(','));
              }}
            >
              {selectedMarket.charAt(0).toUpperCase() + selectedMarket.slice(1)}
              <ChevronDown size={16} className="text-gray-400" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          {error ? (
            <div className="text-red-500 text-sm px-4">Error: {error}</div>
          ) : (
            // The ticker items are wrapped in a div with a marquee animation.
            <div className="whitespace-nowrap animate-marquee">
              {tickerData.map((item, index) => renderTickerItem(item, index))}
              {tickerData.map((item, index) => renderTickerItem(item, index))}
            </div>
          )}
        </div>
        <div className="px-4">
          <button
            onClick={() => setShowWatchlist(!showWatchlist)}
            className="text-sm text-blue-500 underline"
          >
            {showWatchlist ? 'Hide Watchlist' : 'Edit Watchlist'}
          </button>
        </div>
      </div>
      {showWatchlist && (
        <div
          className={`p-4 border-t border-brand-primary/20 max-w-md relative z-[60] ${
            theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
          }`}
        >
          <label htmlFor="watchlist" className="block text-sm font-medium mb-1">
            Update Watchlist (comma-separated symbols)
          </label>
          <div className="flex flex-col gap-2">
            <input
              id="watchlist"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className={`flex-1 border rounded px-3 py-2 ${
                theme === 'dark'
                  ? 'bg-gray-700 text-white border-gray-600'
                  : 'bg-gray-100 text-gray-900 border-gray-300'
              }`}
              placeholder="e.g., AAPL,TSLA,MSFT"
            />
            <div className="flex gap-2">
              <button
                onClick={handleWatchlistUpdate}
                className="px-4 py-2 bg-brand-primary text-white rounded"
              >
                Update
              </button>
              <button
                onClick={() => setShowWatchlist(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded"
              >
                Close
              </button>
            </div>
            <div className="mt-2">
              <p className="text-sm font-medium mb-1">Current Watchlist:</p>
              <div className="flex flex-wrap gap-2">
                {watchlist.map((symbol) => (
                  <div
                    key={symbol}
                    className="flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-gray-200 dark:bg-gray-600"
                  >
                    <span>{symbol}</span>
                    <button onClick={() => removeSymbol(symbol)} className="text-red-500">
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}