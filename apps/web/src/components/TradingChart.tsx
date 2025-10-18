import { useCallback, useEffect, useMemo, useState } from 'react';
import ApexChart from 'react-apexcharts';
import type { ApexAxisChartSeries, ApexOptions } from 'apexcharts';

import { useTheme } from '../contexts/ThemeContext';
import type { ChartBar, MarketQuote } from '../lib/api';
import { fetchChartData, getMarketQuote } from '../lib/api';

const chartTypes = ['candlestick', 'line'] as const;
const timeframes = ['1D', '1W', '1M', '1Y'] as const;
const timeframeRequestMap = {
  '1D': '1Day',
  '1W': '1Week',
  '1M': '1Month',
  '1Y': '1Year',
} as const;

const RSI_PERIOD = 14;

type ChartType = typeof chartTypes[number];
type Timeframe = typeof timeframes[number];

type MarketType = 'stocks' | 'crypto' | 'forex';

interface TradingChartProps {
  symbol: string;
  className?: string;
  market?: MarketType;
}

interface CompanyOverview {
  MarketCapitalization?: string;
  Volume?: string;
  PERatio?: string;
}

function formatPrice(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) {
    return 'N/A';
  }
  return `$${value.toFixed(2)}`;
}

function formatLargeNumber(value?: string | number | null) {
  if (value == null || value === '') {
    return 'N/A';
  }
  const numeric = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(numeric)) {
    return 'N/A';
  }
  if (numeric >= 1_000_000_000_000) return `${(numeric / 1_000_000_000_000).toFixed(2)}T`;
  if (numeric >= 1_000_000_000) return `${(numeric / 1_000_000_000).toFixed(2)}B`;
  if (numeric >= 1_000_000) return `${(numeric / 1_000_000).toFixed(2)}M`;
  if (numeric >= 1_000) return `${(numeric / 1_000).toFixed(2)}K`;
  return numeric.toLocaleString();
}

function calculateRSI(prices: number[], period: number = RSI_PERIOD): number[] {
  if (prices.length <= period) {
    return [];
  }

  const rsiValues: number[] = [];
  for (let i = period; i < prices.length; i++) {
    let gains = 0;
    let losses = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const change = prices[j] - prices[j - 1];
      if (change >= 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }
    const averageGain = gains / period;
    const averageLoss = losses / period;
    const rs = averageLoss === 0 ? 100 : averageGain / (averageLoss || 1);
    const rsi = 100 - 100 / (1 + rs);
    rsiValues.push(Number(rsi.toFixed(2)));
  }

  return rsiValues;
}

export default function TradingChart({ symbol, className, market = 'stocks' }: TradingChartProps) {
  const { theme } = useTheme();
  const normalizedSymbol = symbol.trim().toUpperCase();

  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [timeframe, setTimeframe] = useState<Timeframe>('1D');
  const [showSMA, setShowSMA] = useState(true);
  const [showRSI, setShowRSI] = useState(false);

  const [bars, setBars] = useState<ChartBar[]>([]);
  const [quote, setQuote] = useState<MarketQuote | null>(null);
  const [overview, setOverview] = useState<CompanyOverview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChartData = useCallback(async () => {
    if (!normalizedSymbol) {
      return [] as ChartBar[];
    }

    const params = {
      symbol: normalizedSymbol,
      timeframe: timeframeRequestMap[timeframe],
      market,
    };

    const { bars: responseBars } = await fetchChartData(params);
    return responseBars
      .filter((bar): bar is ChartBar => (
        typeof bar?.t === 'string'
        && [bar.o, bar.h, bar.l, bar.c].every((value) => typeof value === 'number' && Number.isFinite(value))
      ));
  }, [market, normalizedSymbol, timeframe]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    let canceled = false;

    const run = async () => {
      if (!normalizedSymbol) {
        setBars([]);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const sanitizedBars = await loadChartData();
        if (!canceled) {
          setBars(sanitizedBars);
        }
      } catch (err) {
        if (!canceled) {
          console.error('Failed to fetch chart data', err);
          setError(err instanceof Error ? err.message : 'Failed to load chart data');
          setBars([]);
        }
      } finally {
        if (!canceled) {
          setIsLoading(false);
        }
      }
    };

    void run();
    const interval = window.setInterval(() => {
      void run();
    }, 30_000);

    return () => {
      canceled = true;
      window.clearInterval(interval);
    };
  }, [loadChartData, normalizedSymbol]);

  useEffect(() => {
    if (!normalizedSymbol) {
      setQuote(null);
      return;
    }

    if (typeof window === 'undefined') {
      return undefined;
    }

    let canceled = false;

    const loadQuote = async () => {
      try {
        const data = await getMarketQuote(normalizedSymbol, market);
        if (!canceled) {
          setQuote(data);
        }
      } catch (err) {
        if (!canceled) {
          console.warn('Failed to fetch market quote', err);
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
  }, [market, normalizedSymbol]);

  useEffect(() => {
    if (market !== 'stocks' || !normalizedSymbol) {
      setOverview(null);
      return;
    }

    const apiKey = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      setOverview(null);
      return;
    }

    let canceled = false;

    const loadOverview = async () => {
      try {
        const response = await fetch(
          `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${normalizedSymbol}&apikey=${apiKey}`,
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch company overview (${response.status})`);
        }
        const data = await response.json() as unknown;
        if (!canceled) {
          if (data && typeof data === 'object' && !('Note' in (data as Record<string, unknown>))) {
            setOverview(data as CompanyOverview);
          } else {
            setOverview(null);
          }
        }
      } catch (err) {
        if (!canceled) {
          console.warn('Failed to fetch company overview', err);
          setOverview(null);
        }
      }
    };

    void loadOverview();

    return () => {
      canceled = true;
    };
  }, [market, normalizedSymbol]);

  const series = useMemo<ApexAxisChartSeries>(() => {
    if (!bars.length) {
      return [];
    }

    const baseSeries: ApexAxisChartSeries = chartType === 'candlestick'
      ? [{
          name: 'Price',
          data: bars.map((bar) => ({
            x: new Date(bar.t),
            y: [bar.o, bar.h, bar.l, bar.c] as const,
          })),
        }]
      : [{
          name: 'Price',
          data: bars.map((bar) => ({
            x: new Date(bar.t),
            y: Number(bar.c.toFixed(2)),
          })),
        }];

    const smaSeries: ApexAxisChartSeries = showSMA
      ? (() => {
          const points = bars
            .map((bar, index, array) => {
              if (index < 9) {
                return null;
              }
              const window = array.slice(index - 9, index + 1);
              const average = window.reduce((total, item) => total + item.c, 0) / window.length;
              return { x: new Date(bar.t), y: Number(average.toFixed(2)) };
            })
            .filter((point): point is { x: Date; y: number } => point !== null);

          return points.length
            ? [{ name: 'SMA (10)', data: points }]
            : [];
        })()
      : [];

    const rsiSeries: ApexAxisChartSeries = showRSI
      ? (() => {
          const prices = bars.map((bar) => bar.c);
          const values = calculateRSI(prices, RSI_PERIOD);
          if (!values.length) {
            return [];
          }
          const points = values
            .map((value, index) => {
              const bar = bars[index + RSI_PERIOD];
              if (!bar) {
                return null;
              }
              return { x: new Date(bar.t), y: value };
            })
            .filter((point): point is { x: Date; y: number } => point !== null);

          return points.length
            ? [{ name: 'RSI', data: points }]
            : [];
        })()
      : [];

    return [...baseSeries, ...smaSeries, ...rsiSeries];
  }, [bars, chartType, showRSI, showSMA]);

  const chartOptions = useMemo<ApexOptions>(() => ({
    chart: {
      type: chartType,
      background: 'transparent',
      toolbar: { show: true },
    },
    theme: { mode: theme === 'dark' ? 'dark' : 'light' },
    xaxis: { type: 'datetime' },
    yaxis: [{
      labels: {
        formatter: (value: number) => value.toFixed(2),
      },
    }],
    tooltip: {
      shared: true,
      theme: theme === 'dark' ? 'dark' : 'light',
    },
    legend: { show: true },
    stroke: {
      curve: 'smooth',
      width: chartType === 'line' ? 2 : 1,
    },
  }), [chartType, theme]);

  const containerClassName = ['p-4', className].filter(Boolean).join(' ');

  return (
    <div className={containerClassName}>
      <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
        <div className="space-x-2">
          {chartTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setChartType(type)}
              className={`px-3 py-1 rounded transition-colors ${
                chartType === type
                  ? 'bg-green-600 text-white shadow'
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
              }`}
            >
              {type === 'candlestick' ? 'Candlestick' : 'Line'}
            </button>
          ))}
        </div>

        <div className="space-x-2">
          {timeframes.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTimeframe(value)}
              className={`px-3 py-1 rounded transition-colors ${
                timeframe === value
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
              }`}
            >
              {value}
            </button>
          ))}
        </div>

        <div className="space-x-3">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showSMA}
              onChange={() => setShowSMA((value) => !value)}
            />
            SMA
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showRSI}
              onChange={() => setShowRSI((value) => !value)}
            />
            RSI
          </label>
        </div>
      </div>

      <div className="relative">
        <ApexChart
          options={chartOptions}
          series={series}
          type={chartType === 'candlestick' ? 'candlestick' : 'line'}
          height={500}
        />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-gray-900/60">
            <span className="text-gray-700 dark:text-gray-200 font-medium">Loading chart…</span>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-500">{error}</p>
      )}

      {!isLoading && !bars.length && !error && (
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          No market data available for {normalizedSymbol}.
        </p>
      )}

      {market === 'stocks' && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded shadow">
              <h3 className="text-sm text-gray-600 dark:text-gray-400">Bid Price</h3>
              <p className="text-lg font-semibold text-brand-primary">{formatPrice(quote?.bidPrice)}</p>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded shadow">
              <h3 className="text-sm text-gray-600 dark:text-gray-400">Ask Price</h3>
              <p className="text-lg font-semibold text-brand-primary">{formatPrice(quote?.askPrice)}</p>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded shadow">
              <h3 className="text-sm text-gray-600 dark:text-gray-400">Last Update</h3>
              <p className="text-lg font-semibold text-brand-primary">
                {quote?.ts ? new Date(quote.ts).toLocaleString() : 'N/A'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded shadow">
              <h3 className="text-sm text-gray-600 dark:text-gray-400">Market Cap</h3>
              <p className="text-lg font-semibold text-brand-primary">
                {formatLargeNumber(overview?.MarketCapitalization)}
              </p>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded shadow">
              <h3 className="text-sm text-gray-600 dark:text-gray-400">Volume</h3>
              <p className="text-lg font-semibold text-brand-primary">
                {formatLargeNumber(overview?.Volume)}
              </p>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded shadow">
              <h3 className="text-sm text-gray-600 dark:text-gray-400">P/E Ratio</h3>
              <p className="text-lg font-semibold text-brand-primary">
                {overview?.PERatio ? Number(overview.PERatio).toFixed(2) : 'N/A'}
              </p>
            </div>
          </div>

          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded shadow">
            <h3 className="text-lg font-semibold text-brand-primary">Order Book</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Live order book data is not available yet. Check back soon for real-time depth.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
