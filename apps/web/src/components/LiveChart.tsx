import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ApexChart from 'react-apexcharts';

interface Bar {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
}

type CandlePoint = { x: Date; y: [number, number, number, number] };
type CandleSeries = { data: CandlePoint[] };

const LiveChart = ({ symbol }: { symbol: string }) => {
  const [series, setSeries] = useState<CandleSeries[]>([{ data: [] }]);

  const options = useMemo(
    () => ({
      chart: {
        id: 'live-background',
        type: 'candlestick',
        background: 'transparent',
        animations: {
          enabled: true,
          easing: 'linear',
          dynamicAnimation: { speed: 1000 },
        },
        toolbar: { show: false },
        zoom: { enabled: false },
      },
      grid: { show: false },
      xaxis: { type: 'datetime', labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
      yaxis: { show: false },
      tooltip: { enabled: false },
    }),
    []
  );

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/chart-data?symbol=${symbol}&timeframe=1D&market=stocks`);
      const json = (await res.json()) as { bars?: Bar[] };
      const bars: Bar[] = Array.isArray(json.bars) ? json.bars : [];

      const formatted = bars.map((bar) => ({
        x: new Date(bar.t),
        y: [bar.o, bar.h, bar.l, bar.c],
      }));

      setSeries([{ data: formatted }]);
    } catch (err) {
      console.error('Chart fetch error:', err);
    }
  }, [symbol]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="absolute inset-0 -z-10 opacity-10 pointer-events-none">
      <ApexChart options={options} series={series} type="candlestick" height="100%" width="100%" />
    </div>
  );
};

export default LiveChart;
