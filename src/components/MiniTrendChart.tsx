// src/components/MiniTrendChart.tsx
import { Sparklines, SparklinesLine } from 'react-sparklines';

export default function MiniTrendChart({ data }: { data: number[] }) {
  return (
    <Sparklines data={data} width={100} height={30}>
      <SparklinesLine color="cyan" style={{ strokeWidth: 2, fill: 'none' }} />
    </Sparklines>
  );
}
