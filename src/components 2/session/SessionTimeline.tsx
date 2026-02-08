"use client";

import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { FocusSnapshot } from "@/lib/session-types";

interface SessionTimelineProps {
  snapshots: FocusSnapshot[];
  startTime: number;
  height?: number;
}

/**
 * Format elapsed seconds as mm:ss.
 */
function formatElapsed(seconds: number): string {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(Math.round(seconds) % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

/**
 * Recharts AreaChart showing focus score over session duration.
 *
 * Uses an SSR guard (same pattern as FocusSparkline) to prevent
 * window/document access during server rendering.
 * Animation disabled for performance.
 */
export default function SessionTimeline({
  snapshots,
  startTime,
  height = 200,
}: SessionTimelineProps) {
  // SSR guard: Recharts accesses window/document internally
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        style={{ width: "100%", height }}
        className="rounded bg-gray-800/50"
      />
    );
  }

  // Convert timestamps to elapsed seconds for display
  const data = snapshots.map((snap) => ({
    elapsed: (snap.time - startTime) / 1000,
    score: snap.score,
  }));

  if (data.length === 0) {
    return (
      <div
        style={{ width: "100%", height }}
        className="flex items-center justify-center rounded bg-gray-800/30 text-sm text-gray-500"
      >
        No score data recorded
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="focusGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
          </linearGradient>
        </defs>

        <XAxis
          dataKey="elapsed"
          tickFormatter={formatElapsed}
          stroke="#6b7280"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />

        <YAxis
          domain={[0, 100]}
          stroke="#6b7280"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          width={30}
        />

        <ReferenceLine
          y={70}
          stroke="#22c55e"
          strokeDasharray="4 4"
          strokeOpacity={0.6}
          label={{
            value: "Focus threshold",
            position: "right",
            fill: "#22c55e",
            fontSize: 10,
            opacity: 0.7,
          }}
        />

        <Tooltip
          contentStyle={{
            backgroundColor: "#1f2937",
            border: "1px solid #374151",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          labelFormatter={(val) => `Time: ${formatElapsed(val as number)}`}
          formatter={(value: number | undefined) => [`${Math.round(value ?? 0)}`, "Score"]}
        />

        <Area
          type="monotone"
          dataKey="score"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#focusGradient)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
