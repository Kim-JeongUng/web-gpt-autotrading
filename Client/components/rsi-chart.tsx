"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Area,
} from "recharts";

interface RSIData {
  time: string;
  rsi: number;
}

interface Props {
  data: RSIData[];
}

export function RSIChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" />
        <YAxis domain={[0, 100]} />
        <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}`, "RSI"]} />
        <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="2 2" />
        <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="2 2" />
        <Area
          type="monotone"
          dataKey="rsi"
          stroke="#f59e0b"
          fill="#f59e0b"
          fillOpacity={0.1}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

