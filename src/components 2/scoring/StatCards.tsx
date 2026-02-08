'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface StatCardsProps {
  score: number;
  sessionStartTime: number;
  history: { time: number; score: number }[];
}

/**
 * Three session metric cards: Current Score, Session Duration, Average Score.
 * Duration updates every second via setInterval.
 */
export default function StatCards({
  score,
  sessionStartTime,
  history,
}: StatCardsProps) {
  const [elapsed, setElapsed] = useState('00:00');

  // Tick session duration every second
  useEffect(() => {
    const tick = () => {
      const seconds = Math.floor((Date.now() - sessionStartTime) / 1000);
      const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
      const ss = String(seconds % 60).padStart(2, '0');
      setElapsed(`${mm}:${ss}`);
    };

    tick(); // Initial
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [sessionStartTime]);

  // Average score from history
  const average =
    history.length > 0
      ? Math.round(history.reduce((sum, h) => sum + h.score, 0) / history.length)
      : null;

  // Color based on score level (matches ring color scheme)
  const scoreColor =
    score >= 70
      ? 'text-green-400'
      : score >= 40
        ? 'text-yellow-400'
        : 'text-red-400';

  const avgColor =
    average !== null
      ? average >= 70
        ? 'text-green-400'
        : average >= 40
          ? 'text-yellow-400'
          : 'text-red-400'
      : 'text-gray-500';

  return (
    <div className="grid grid-cols-3 gap-3">
      <Card label="Current Score" value={String(Math.round(score))} valueClass={scoreColor} />
      <Card label="Duration" value={elapsed} valueClass="text-blue-400" />
      <Card
        label="Average"
        value={average !== null ? String(average) : '--'}
        valueClass={avgColor}
      />
    </div>
  );
}

function Card({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <p className="text-sm text-gray-400">{label}</p>
      <p className={cn('text-2xl font-bold', valueClass)}>{value}</p>
    </div>
  );
}
