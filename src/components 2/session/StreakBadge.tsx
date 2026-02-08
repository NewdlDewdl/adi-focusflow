"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";

interface StreakBadgeProps {
  streak: number;
}

/**
 * Consecutive-day streak display with flame icon.
 *
 * - streak === 0: muted "No streak yet" text
 * - streak >= 1: flame icon + "{N} day streak" in amber
 * - streak >= 7: adds an amber ring glow effect
 *
 * Uses framer-motion for a subtle pulse animation when streak > 0.
 */
export default function StreakBadge({ streak }: StreakBadgeProps) {
  if (streak === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-900 px-4 py-2.5">
        <Flame className="h-5 w-5 text-gray-600" />
        <span className="text-sm text-gray-500">No streak yet</span>
      </div>
    );
  }

  const isWeekPlus = streak >= 7;

  return (
    <motion.div
      className={`flex items-center gap-2 rounded-lg border bg-gray-900 px-4 py-2.5 ${
        isWeekPlus
          ? "border-amber-600/50 ring-2 ring-amber-500/20"
          : "border-gray-800"
      }`}
      animate={{ scale: [1, 1.03, 1] }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <Flame
        className={`h-5 w-5 ${
          isWeekPlus ? "text-amber-400" : "text-orange-400"
        }`}
      />
      <span className="text-sm font-medium text-amber-300">
        {streak} day{streak !== 1 ? "s" : ""} streak
      </span>
    </motion.div>
  );
}
