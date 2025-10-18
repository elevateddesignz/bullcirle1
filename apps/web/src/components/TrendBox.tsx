// src/components/TrendBox.tsx
import MiniTrendChart from './MiniTrendChart';

interface TrendPoint {
  close: number;
  volume: number;
}

export default function TrendBox({ history }: { history: TrendPoint[] }) {
  if (history.length === 0) {
    return null;
  }

  const close = history.map((point) => point.close);
  const volume = history.map((point) => point.volume);
  const avgVol = Math.round(volume.reduce((total, value) => total + value, 0) / volume.length);
  const lastClose = close[close.length - 1];
  const firstClose = close[0];
  const change = firstClose !== 0 ? (((lastClose - firstClose) / firstClose) * 100).toFixed(2) : '0.00';
  const numericChange = Number.parseFloat(change);
  const emoji = numericChange > 2 ? '📈' : numericChange < -2 ? '📉' : '→';

  return (
    <div className="bg-gray-900 p-3 rounded-xl w-fit text-xs text-white border border-gray-700">
      <MiniTrendChart data={close} />
      <p className="mt-1">5d % Change: {change}% {emoji}</p>
      <p>Avg Volume: {avgVol.toLocaleString()}</p>
    </div>
  );
}
