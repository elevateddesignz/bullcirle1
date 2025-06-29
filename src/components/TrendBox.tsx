// src/components/TrendBox.tsx
import MiniTrendChart from './MiniTrendChart';

export default function TrendBox({ history }: { history: any[] }) {
  const close = history.map(d => d.close);
  const volume = history.map(d => d.volume);
  const avgVol = Math.round(volume.reduce((a, b) => a + b, 0) / volume.length);
  const change = ((close.at(-1) - close[0]) / close[0] * 100).toFixed(2);
  const emoji = +change > 2 ? '📈' : +change < -2 ? '📉' : '→';

  return (
    <div className="bg-gray-900 p-3 rounded-xl w-fit text-xs text-white border border-gray-700">
      <MiniTrendChart data={close} />
      <p className="mt-1">5d % Change: {change}% {emoji}</p>
      <p>Avg Volume: {avgVol.toLocaleString()}</p>
    </div>
  );
}
