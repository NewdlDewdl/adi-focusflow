'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  YAxis,
} from 'recharts';

interface FocusSparklineProps {
  data: { time: number; score: number }[];
  width?: number | `${number}%`;
  height?: number;
}

/**
 * Recharts sparkline showing focus score trend over the session.
 * Uses SSR guard to avoid window/document errors during server rendering.
 * Animation disabled for real-time update performance.
 */
export default function FocusSparkline({
  data,
  width = '100%',
  height = 60,
}: FocusSparklineProps) {
  // SSR guard: Recharts accesses window/document internally
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        style={{
          width: typeof width === 'number' ? width : '100%',
          height,
        }}
        className="rounded bg-gray-800/50"
      />
    );
  }

  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={data}>
        <YAxis domain={[0, 100]} hide />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
