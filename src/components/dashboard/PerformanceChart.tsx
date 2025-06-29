// src/components/dashboard/PerformanceChart.tsx
import { useEnvMode } from '../../contexts/EnvModeContext';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export interface DataPoint {
  date: string;
  value: number;
}

interface Props {
  data: DataPoint[];
}

export default function PerformanceChart({ data }: Props) {
  const { envMode } = useEnvMode();
  const isLight = String(envMode) === 'light';

  const gridColor   = isLight ? '#e5e7eb' : '#374151';
  const textColor   = isLight ? '#4B5563' : '#D1D5DB';
  const lineColor   = isLight ? '#3B82F6' : '#60A5FA';
  const tooltipBg   = isLight ? '#ffffff' : '#374151';
  const tooltipText = isLight ? '#1F2937' : '#F9FAFB';

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
      <h3 className={`text-lg font-semibold ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>
        Portfolio Performance
      </h3>

      {data.length === 0 ? (
        <p className={`${isLight ? 'text-gray-500' : 'text-gray-400'} mt-4`}>
          No performance data.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="date"
              tick={{ fill: textColor, fontSize: 12 }}
              axisLine={{ stroke: gridColor }}
              tickLine={{ stroke: gridColor }}
            />
            <YAxis
              tick={{ fill: textColor, fontSize: 12 }}
              axisLine={{ stroke: gridColor }}
              tickLine={{ stroke: gridColor }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: tooltipBg, borderColor: gridColor }}
              itemStyle={{ color: tooltipText }}
              labelStyle={{ color: tooltipText }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={lineColor}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
