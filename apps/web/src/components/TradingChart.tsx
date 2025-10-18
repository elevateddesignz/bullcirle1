import { useEffect, useState } from 'react';
import ApexChart from 'react-apexcharts';
import { useTheme } from '../contexts/ThemeContext';
import { getMarketQuote, marketFetch } from '../lib/api';
import type { MarketQuote } from '../lib/api';

// Define supported timeframes and chart types.
const timeframes = ['1D', '1W', '1M', '1Y'] as const;
const chartTypes = ['candlestick', 'line', 'area'] as const;

// Define default symbols for each market.
const defaultSymbols: Record<string, string[]> = {
  stocks: ['AAPL', 'TSLA', 'AMZN', 'MSFT', 'GOOGL'],
  crypto: ['BTCUSD', 'ETHUSD', 'XRPUSD', 'LTCUSD', 'BCHUSD'],
  forex: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD'],
};

function formatPrice(value: number | null | undefined): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `$${value.toFixed(2)}`;
  }
  return 'N/A';
}

interface TradingChartProps {
  // The market to use (stocks, crypto, or forex). For extra info, only stocks will show the overview.
  market?: 'stocks' | 'crypto' | 'forex';
  // The symbol to chart (defaults to the first symbol of the market if not provided).
  symbol?: string;
}

export default function TradingChart({ market = 'stocks', symbol: initialSymbol }: TradingChartProps) {
  // Local symbol state; if no symbol is provided, default to the first symbol in the market's list.
  const [symbol, setSymbol] = useState<string>(initialSymbol || defaultSymbols[market][0]);
  const [timeframe, setTimeframe] = useState<'1D' | '1W' | '1M' | '1Y'>('1D');
  const [chartType, setChartType] = useState<'candlestick' | 'line' | 'area'>('candlestick');
  const [series, setSeries] = useState<any[]>([]);
  const [showSMA, setShowSMA] = useState(false);
  const [showRSI, setShowRSI] = useState(false);
  const { theme } = useTheme();
  const [quote, setQuote] = useState<MarketQuote | null>(null);

  // When the market prop changes, update the symbol to the default for that market.
  useEffect(() => {
    setSymbol(defaultSymbols[market][0]);
  }, [market]);

  // NEW: When the provided symbol prop changes, update the local symbol state.
  useEffect(() => {
    if (initialSymbol) {
      setSymbol(initialSymbol);
    }
  }, [initialSymbol]);

  // Fetch latest quote information for stocks via the authenticated market API.
  useEffect(() => {
    if (market !== 'stocks') {
      setQuote(null);
      return;
    }

    let canceled = false;

    const loadQuote = async () => {
      try {
        const data = await getMarketQuote(symbol);
        if (!canceled) {
          setQuote(data);
        }
      } catch (error) {
        console.error('Failed to fetch market quote', error);
        if (!canceled) {
          setQuote(null);
        }
      }
    };

    void loadQuote();
    const interval = window.setInterval(loadQuote, 60_000);
    return () => {
      canceled = true;
      window.clearInterval(interval);
    };
  }, [symbol, market]);

  // Function to fetch chart data from the backend.
  // The backend should select the proper data provider based on the "market" parameter.
  const fetchChartData = async () => {
    try {
      const timeframeMap: Record<typeof timeframe, string> = {
        '1D': '5Min',
        '1W': '15Min',
        '1M': '30Min',
        '1Y': '60Min',
      };
      const tf = timeframeMap[timeframe];
      const params = new URLSearchParams({
        symbol: symbol.trim().toUpperCase(),
        timeframe: tf,
        limit: '500',
      });
      const response = await marketFetch(`/market/bars?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Error fetching chart data: ${response.statusText}`);
      }
      const payload = await response.json() as { bars?: any[] };
      const bars = Array.isArray(payload?.bars) ? payload.bars : [];
      if (!bars || bars.length === 0) {
        console.warn(`No data available for ${symbol} in market ${market}`);
        setSeries([]);
        return;
      }
      // Transform bars for candlestick charts.
      const transformedCandles = bars.map((bar: any) => ({
        x: new Date(bar.t),
        y: [bar.o, bar.h, bar.l, bar.c],
      }));
      // Transform bars for line charts.
      const transformedLine = bars.map((bar: any) => ({
        x: new Date(bar.t),
        y: bar.c,
      }));
      // Calculate SMA (period = 10) if enabled.
      const smaData = showSMA
        ? [{
            name: 'SMA (10)',
            data: bars
              .map((bar: any, i: number, arr: any[]) => ({
                x: new Date(bar.t),
                y: i >= 9
                  ? parseFloat((arr.slice(i - 9, i + 1).reduce((acc, b) => acc + b.c, 0) / 10).toFixed(2))
                  : null,
              }))
              .filter((point: any) => point.y !== null),
          }]
        : [];
      const prices = bars.map((bar: any) => bar.c);
      // Calculate RSI (period = 14) if enabled.
      const rsiData = showRSI && prices.length > 14
        ? [{
            name: 'RSI',
            data: calculateRSI(prices).map((r, i) => ({
              x: new Date(bars[i + 14]?.t),
              y: r,
            })),
          }]
        : [];
      // Choose the base series based on chart type.
      const baseSeries = chartType === 'candlestick'
        ? [{ name: 'Price', data: transformedCandles }]
        : [{ name: 'Price', data: transformedLine }];
      setSeries([...baseSeries, ...smaData, ...rsiData]);
    } catch (err) {
      console.error('❌ Failed to fetch or parse chart data:', err);
    }
  };

  // Fetch chart data on mount and whenever dependencies change.
  useEffect(() => {
    fetchChartData();
    const interval = setInterval(fetchChartData, 30000);
    return () => clearInterval(interval);
  }, [symbol, timeframe, chartType, showSMA, showRSI, market]);

  // ApexCharts options.
  const chartOptions = {
    chart: {
      type: chartType,
      background: 'transparent',
      toolbar: { show: true },
    },
    theme: { mode: theme === 'dark' ? 'dark' as 'dark' : 'light' as 'light' },
    xaxis: { type: 'datetime' as 'datetime' },
    yaxis: { tooltip: { enabled: true } },
    tooltip: { shared: true, enabled: true },
  };

  return (
    <div className="p-4">
      {/* Top Controls */}
      <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
        <div className="space-x-2">
          {/* Chart Type Buttons */}
          {chartTypes.map((type) => (
            <button
              key={type}
              onClick={() => setChartType(type)}
              className={`px-3 py-1 rounded ${
                chartType === type
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-white'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        <div className="space-x-2">
          {/* Timeframe Buttons */}
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1 rounded ${
                timeframe === tf
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-white'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
        <div className="space-x-3">
          {/* Indicators Toggle */}
          <label className="inline-flex items-center gap-1">
            <input type="checkbox" checked={showSMA} onChange={() => setShowSMA(!showSMA)} />
            SMA
          </label>
          <label className="inline-flex items-center gap-1">
            <input type="checkbox" checked={showRSI} onChange={() => setShowRSI(!showRSI)} />
            RSI
          </label>
        </div>
      </div>

      {/* Chart Display */}
      <ApexChart
        options={chartOptions}
        series={series}
        type={chartType === 'candlestick' ? 'candlestick' : 'line'}
        height={500}
      />

      {/* Additional Stock Overview Info */}
      {market === 'stocks' && (
        <div className="mt-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded shadow">
              <h2 className="text-sm text-gray-600 dark:text-gray-400">Bid Price</h2>
              <p className="text-lg font-bold text-brand-primary">
                {formatPrice(quote?.bidPrice)}
              </p>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded shadow">
              <h2 className="text-sm text-gray-600 dark:text-gray-400">Ask Price</h2>
              <p className="text-lg font-bold text-brand-primary">
                {formatPrice(quote?.askPrice)}
              </p>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded shadow">
              <h2 className="text-sm text-gray-600 dark:text-gray-400">Last Update</h2>
              <p className="text-lg font-bold text-brand-primary">
                {quote?.ts ? new Date(quote.ts).toLocaleString() : 'N/A'}
              </p>
            </div>
          </div>

          {/* Order Book Section (updates when symbol changes if available) */}
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded shadow mt-4">
            <h2 className="text-lg font-bold text-brand-primary">Order Book</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {/* Update this section when a real order book API becomes available */}
              Live order book data not available.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper: Simple RSI (Relative Strength Index) calculation.
function calculateRSI(prices: number[], period: number = 14): number[] {
  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }
  const rsi: number[] = [];
  for (let i = 0; i <= gains.length - period; i++) {
    const avgGain = gains.slice(i, i + period).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(i, i + period).reduce((a, b) => a + b, 0) / period;
    const rs = avgGain / (avgLoss || 1);
    rsi.push(100 - 100 / (1 + rs));
  }
  return rsi.map((val) => parseFloat(val.toFixed(2)));
}