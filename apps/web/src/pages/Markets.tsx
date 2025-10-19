import { useState, useEffect } from 'react';
import { Globe, TrendingUp, TrendingDown, Search, ArrowRight, Star } from 'lucide-react';
import { useSearch } from '../contexts/SearchContext';
import { useWatchlist } from '../contexts/WatchlistContext';
import Watchlist from '../components/dashboard/Watchlist';
import { resolveApiPath } from '../lib/backendConfig';

const defaultStocks = ['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'AMD'];
const defaultCryptos = ['BTCUSD', 'ETHUSD', 'XRPUSD', 'LTCUSD', 'BCHUSD'];
const defaultForex = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD'];

export default function Markets() {
  // Extend market options to include forex.
  const [activeMarket, setActiveMarket] = useState<'stocks' | 'crypto' | 'forex'>('stocks');
  const { searchQuery, setSearchQuery, handleSymbolSelect } = useSearch();
  const { addToWatchlist, isInWatchlist } = useWatchlist();
  const [marketData, setMarketData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Determine the API path and default symbol list based on the active market.
  const getEndpointAndSymbols = (market: 'stocks' | 'crypto' | 'forex') => {
    if (market === 'forex') {
      return {
        path: '/alpha-forex',
        symbols: defaultForex,
      };
    }

    return {
      path: '/alpha-quotes',
      symbols: market === 'stocks' ? defaultStocks : defaultCryptos,
    };
  };

  // Fetch market data using the appropriate backend endpoint.
  const fetchMarketData = async (market: 'stocks' | 'crypto' | 'forex') => {
    setIsLoading(true);
    setError(null);
    try {
      const { path, symbols } = getEndpointAndSymbols(market);
      const symbolQuery = symbols.join(',');
      const url = resolveApiPath(`${path}?symbols=${encodeURIComponent(symbolQuery)}`);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      // For stocks and crypto, assume data.quotes returns an object with symbol keys.
      // For forex, assume data.quotes returns an object with keys that match defaultForex.
      const results = symbols.map((symbol) => ({
        symbol,
        name: symbol, // Optionally, enhance with a company/asset lookup.
        price:
          market === 'forex'
            ? parseFloat(data.quotes[symbol]?.["5. Exchange Rate"]) || 0
            : parseFloat(data.quotes[symbol]?.["05. price"]) || 0,
        // For forex, we may not have a previous close so set change to 0.
        change:
          market === 'forex'
            ? 0
            : parseFloat(data.quotes[symbol]?.["09. change"]) || 0,
        market
      }));
      setMarketData(results);
    } catch (err: any) {
      console.error('Failed to fetch market data:', err);
      setError('Failed to load market data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketData(activeMarket);
  }, [activeMarket]);

  const filteredData = marketData.filter(item =>
    item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddToWatchlist = (symbol: string, name: string) => {
    addToWatchlist(symbol, name);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Markets</h1>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeMarket}...`}
            className="w-full md:w-64 bg-white dark:bg-gray-800/50 text-gray-900 dark:text-white rounded-lg pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 transition-colors"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        </div>
      </div>

      {/* Watchlist Section */}
      <div className="bg-white dark:bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-lg p-6">
        <Watchlist horizontal={false} />
      </div>

      <div className="flex gap-2">
        {(['stocks', 'crypto', 'forex'] as const).map((market) => (
          <button
            key={market}
            onClick={() => setActiveMarket(market)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200 ${
              activeMarket === market
                ? 'bg-brand-primary/20 text-brand-primary'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50'
            }`}
          >
            {market === 'stocks' ? (
              <TrendingUp size={20} />
            ) : market === 'crypto' ? (
              <Globe size={20} />
            ) : (
              <ArrowRight size={20} /> // You might choose a different icon for forex.
            )}
            {market.charAt(0).toUpperCase() + market.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-brand-primary/20 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-200 dark:border-brand-primary/20 text-sm font-medium text-gray-500 dark:text-gray-400">
          <div className="col-span-5">Symbol / Name</div>
          <div className="col-span-3 text-right">Price</div>
          <div className="col-span-2 text-right">24h Change</div>
          <div className="col-span-2"></div>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading market data...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : filteredData.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No results found for "{searchQuery}"
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredData.map((item) => (
              <div
                key={`${item.market}-${item.symbol}`}
                className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <div className="col-span-5">
                  <div className="font-medium text-brand-primary">{item.symbol}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">{item.name}</div>
                </div>
                <div className="col-span-3 text-right font-medium text-gray-900 dark:text-white">
                  {activeMarket === 'forex'
                    ? parseFloat(item.price.toString()).toFixed(4)
                    : `$${item.price.toLocaleString()}`}
                </div>
                <div className={`col-span-2 text-right flex items-center justify-end gap-1 text-sm ${item.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {item.change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {item.change >= 0 ? '+' : ''}{item.change}%
                </div>
                <div className="col-span-2 text-right flex items-center justify-end space-x-2">
                  <button
                    onClick={() => handleAddToWatchlist(item.symbol, item.name)}
                    disabled={isInWatchlist(item.symbol)}
                    className={`p-1 rounded transition-colors ${
                      isInWatchlist(item.symbol)
                        ? 'text-yellow-500 cursor-not-allowed'
                        : 'text-gray-400 hover:text-yellow-500'
                    }`}
                    title={isInWatchlist(item.symbol) ? 'Already in watchlist' : 'Add to watchlist'}
                  >
                    <Star size={16} className={isInWatchlist(item.symbol) ? 'fill-current' : ''} />
                  </button>
                  <button
                    onClick={() => handleSymbolSelect(item.symbol)}
                    className="text-gray-400 hover:text-brand-primary transition-colors"
                  >
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
