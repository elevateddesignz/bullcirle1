import { useCallback, useEffect, useMemo, useState } from 'react';
import ApexChart from 'react-apexcharts';
import type { ApexAxisChartSeries, ApexOptions } from 'apexcharts';
import { useTheme } from '../contexts/ThemeContext';
import type { ChartBar } from '../lib/api';
interface CompanyOverview {
  MarketCapitalization?: string;
  Volume?: string;
  PERatio?: string;
}

  const [series, setSeries] = useState<ApexAxisChartSeries>([]);
  const [overview, setOverview] = useState<CompanyOverview | null>(null);

    if (market !== 'stocks') {
      setOverview(null);
      return;
    }

    const apiKey = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
      console.warn('Alpha Vantage API key not found. Please set VITE_ALPHA_VANTAGE_API_KEY in your .env file.');
      return;

    let isActive = true;

    const fetchOverview = async () => {
      try {
        const res = await fetch(
          `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey}`
        );
        if (!res.ok) {
          throw new Error(`Failed to fetch company overview (${res.status})`);
        }
        const data = (await res.json()) as unknown;
        if (!data || typeof data !== 'object' || 'Note' in (data as Record<string, unknown>)) {
          if (isActive) {
            setOverview(null);
          }
          return;
        }
        if (isActive) {
          setOverview(data as CompanyOverview);
        }
      } catch (err) {
        console.error('Failed to fetch company overview:', err);
        if (isActive) {
          setOverview(null);
        }
      }
    };

    fetchOverview();

    return () => {
      isActive = false;
    };
  }, [market, symbol]);

  const timeframeMap = useMemo(
    () => ({
      '1D': '1Day',
      '1W': '1Week',
      '1M': '1Month',
      '1Y': '1Year',
    }),
    []
  );

  const fetchChartData = useCallback(async () => {
        timeframe: timeframeMap[timeframe],
      const bars: ChartBar[] = Array.isArray(response.bars) ? response.bars : [];
      if (bars.length === 0) {

      const transformedCandles = bars.map((bar) => ({
        y: [bar.o, bar.h, bar.l, bar.c] as const,

      const transformedLine = bars.map((bar) => ({

      const smaSeries: ApexAxisChartSeries = showSMA
        ? [
            {
              name: 'SMA (10)',
              data: bars
                .map((bar, index, arr) => {
                  if (index < 9) {
                    return null;
                  }
                  const window = arr.slice(index - 9, index + 1);
                  const average =
                    window.reduce((accumulator, item) => accumulator + item.c, 0) / window.length;
                  return { x: new Date(bar.t), y: Number(average.toFixed(2)) };
                })
                .filter((point): point is { x: Date; y: number } => point !== null),
            },
          ]

      const prices = bars.map((bar) => bar.c);
      const rsiValues = showRSI ? calculateRSI(prices) : [];
      const rsiSeries: ApexAxisChartSeries = showRSI && rsiValues.length > 0
        ? [
            {
              name: 'RSI',
              data: rsiValues
                .map((value, index) => {
                  const bar = bars[index + 14];
                  if (!bar) {
                    return null;
                  }
                  return { x: new Date(bar.t), y: value };
                })
                .filter((point): point is { x: Date; y: number } => point !== null),
            },
          ]

      const baseSeries: ApexAxisChartSeries =
        chartType === 'candlestick'
          ? [
              {
                name: 'Price',
                data: transformedCandles,
              },
            ]
          : [
              {
                name: 'Price',
                data: transformedLine,
              },
            ];

      setSeries([...baseSeries, ...smaSeries, ...rsiSeries]);
  }, [chartType, market, showRSI, showSMA, symbol, timeframe, timeframeMap]);

  }, [envMode, fetchChartData]);
  const chartOptions: ApexOptions = {
    theme: { mode: theme === 'dark' ? 'dark' : 'light' },
    xaxis: { type: 'datetime' },
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