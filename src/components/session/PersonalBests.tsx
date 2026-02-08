"use client";

import { Trophy, Brain, Clock } from "lucide-react";

interface PersonalBestsProps {
  bests: {
    longestFocusStreakMs: number;
    highestScore: number;
    longestSessionMs: number;
  };
}

/**
 * Format milliseconds as "Xm Ys" string.
 */
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

/**
 * Get color class based on score value.
 */
function scoreColor(value: number): string {
  if (value >= 70) return "text-green-400";
  if (value >= 40) return "text-yellow-400";
  return "text-red-400";
}

/**
 * Personal bests card grid showing best score, longest focus streak, and longest session.
 *
 * Three horizontal cards with icons from lucide-react.
 * Metrics that are 0 (no sessions yet) display "--" in muted gray.
 */
export default function PersonalBests({ bests }: PersonalBestsProps) {
  const hasScore = bests.highestScore > 0;
  const hasFocus = bests.longestFocusStreakMs > 0;
  const hasSession = bests.longestSessionMs > 0;

  return (
    <div className="flex gap-3">
      {/* Best Score */}
      <div className="min-w-0 flex-1 rounded-lg border border-gray-800 bg-gray-900 p-3">
        <div className="mb-1 flex items-center gap-1.5">
          <Trophy className="h-4 w-4 text-yellow-400" />
          <span className="text-xs text-gray-500">Best Score</span>
        </div>
        <p
          className={`text-xl font-bold ${
            hasScore ? scoreColor(bests.highestScore) : "text-gray-600"
          }`}
        >
          {hasScore ? Math.round(bests.highestScore) : "--"}
        </p>
      </div>

      {/* Longest Focus */}
      <div className="min-w-0 flex-1 rounded-lg border border-gray-800 bg-gray-900 p-3">
        <div className="mb-1 flex items-center gap-1.5">
          <Brain className="h-4 w-4 text-purple-400" />
          <span className="text-xs text-gray-500">Longest Focus</span>
        </div>
        <p
          className={`text-xl font-bold ${
            hasFocus ? "text-purple-300" : "text-gray-600"
          }`}
        >
          {hasFocus ? formatDuration(bests.longestFocusStreakMs) : "--"}
        </p>
      </div>

      {/* Longest Session */}
      <div className="min-w-0 flex-1 rounded-lg border border-gray-800 bg-gray-900 p-3">
        <div className="mb-1 flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-blue-400" />
          <span className="text-xs text-gray-500">Longest Session</span>
        </div>
        <p
          className={`text-xl font-bold ${
            hasSession ? "text-blue-300" : "text-gray-600"
          }`}
        >
          {hasSession ? formatDuration(bests.longestSessionMs) : "--"}
        </p>
      </div>
    </div>
  );
}
