"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Play, Pause, Square, Clock, Brain, AlertTriangle } from "lucide-react";
import type { SessionPhase } from "@/lib/session-types";

interface SessionControlsProps {
  phase: SessionPhase;
  startTime: number | null;
  pausedAt: number | null;
  totalPausedMs: number;
  focusedMs: number;
  distractionCount: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
}

/**
 * Format milliseconds as mm:ss string.
 */
function formatTimer(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

/**
 * Session control bar with timer display.
 *
 * In "idle" phase: renders a large "Start Focus Session" CTA button.
 * In "running"/"paused" phase: renders timer + pause/resume/end controls + live metrics.
 *
 * Timer state lives INSIDE this component to avoid re-rendering the entire tree.
 * Uses wall-clock math (Date.now() - startTime - totalPausedMs) to prevent drift.
 */
export default function SessionControls({
  phase,
  startTime,
  pausedAt,
  totalPausedMs,
  focusedMs,
  distractionCount,
  onStart,
  onPause,
  onResume,
  onEnd,
}: SessionControlsProps) {
  const [elapsed, setElapsed] = useState("00:00");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Timer interval: compute from wall clock, freeze on pause
  useEffect(() => {
    if (phase === "running" && startTime !== null) {
      const tick = () => {
        const now = Date.now();
        const elapsedMs = now - startTime - totalPausedMs;
        setElapsed(formatTimer(elapsedMs));
      };
      tick(); // Immediate update
      intervalRef.current = setInterval(tick, 1000);
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
      };
    }

    if (phase === "paused" && startTime !== null && pausedAt !== null) {
      // Freeze display at the moment we paused
      const frozenMs = pausedAt - startTime - totalPausedMs;
      setElapsed(formatTimer(frozenMs));
      // No interval -- timer is frozen
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase, startTime, pausedAt, totalPausedMs]);

  // Idle: show CTA button
  if (phase === "idle" || phase === "ended") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <motion.button
          onClick={onStart}
          className="flex items-center gap-3 rounded-2xl bg-warmCoral px-8 py-4 text-lg font-semibold text-warmBeige shadow-lg shadow-warmCoral/30 transition-colors hover:bg-warmCoralLight"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          <Play className="h-6 w-6" />
          Start Focus Session
        </motion.button>
        <p className="text-sm text-warmBrownMuted">
          Click to begin tracking your focus
        </p>
      </div>
    );
  }

  // Running / Paused: show control bar
  return (
    <div className="mx-auto w-full max-w-2xl rounded-xl border border-warmBorder bg-warmSurface px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Elapsed timer */}
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-warmBrownMuted" />
          <span className="font-mono text-xl font-bold text-warmBrown">
            {elapsed}
          </span>
          {phase === "paused" && (
            <span className="rounded bg-warmCoral/10 px-1.5 py-0.5 text-xs font-medium text-warmCoral">
              PAUSED
            </span>
          )}
        </div>

        {/* Live metrics */}
        <div className="hidden items-center gap-4 text-sm sm:flex">
          <span className="flex items-center gap-1.5 text-warmBrownMuted">
            <Brain className="h-3.5 w-3.5 text-green-400" />
            <span className="text-green-400">{formatTimer(focusedMs)}</span>
          </span>
          <span className="flex items-center gap-1.5 text-warmBrownMuted">
            <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />
            <span className="text-orange-400">{distractionCount}</span>
          </span>
        </div>

        {/* Control buttons */}
        <div className="flex items-center gap-2">
          <AnimatePresence mode="wait">
            {phase === "running" ? (
              <motion.button
                key="pause"
                onClick={onPause}
                className="flex items-center gap-1.5 rounded-lg bg-warmBorder px-3 py-2 text-sm font-medium text-warmBrown transition-colors hover:bg-warmBorder/70"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
              >
                <Pause className="h-4 w-4" />
                Pause
              </motion.button>
            ) : (
              <motion.button
                key="resume"
                onClick={onResume}
                className="flex items-center gap-1.5 rounded-lg bg-warmCoral px-3 py-2 text-sm font-medium text-warmBeige transition-colors hover:bg-warmCoralLight"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
              >
                <Play className="h-4 w-4" />
                Resume
              </motion.button>
            )}
          </AnimatePresence>

          <button
            onClick={onEnd}
            className="flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-200"
          >
            <Square className="h-4 w-4" />
            End
          </button>
        </div>
      </div>

      {/* Mobile metrics (visible on small screens) */}
      <div className="mt-2 flex items-center gap-4 text-sm sm:hidden">
        <span className="flex items-center gap-1.5 text-warmBrownMuted">
          <Brain className="h-3.5 w-3.5 text-green-400" />
          <span className="text-green-400">{formatTimer(focusedMs)}</span>
        </span>
        <span className="flex items-center gap-1.5 text-warmBrownMuted">
          <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />
          <span className="text-orange-400">{distractionCount}</span>
        </span>
      </div>
    </div>
  );
}
