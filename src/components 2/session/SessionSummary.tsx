"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Clock, Brain, Target, AlertTriangle } from "lucide-react";
import type { StoredSession } from "@/lib/session-types";
import SessionTimeline from "./SessionTimeline";

interface SessionSummaryProps {
  session: StoredSession;
  onDismiss: () => void;
  newBests?: string[];
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
 * Post-session summary overlay.
 *
 * Full-screen overlay with semi-transparent backdrop showing:
 * - Session stats grid (total time, avg score, focused %, distractions)
 * - Timeline chart of focus score over session
 * - Personal best callouts (if any)
 * - Done button to dismiss
 *
 * Uses framer-motion for entrance animation (fade in + scale up).
 */
export default function SessionSummary({
  session,
  onDismiss,
  newBests,
}: SessionSummaryProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        className="mx-4 w-full max-w-lg rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-2xl"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <CheckCircle2 className="h-7 w-7 text-green-400" />
          <h2 className="text-xl font-bold text-white">Session Complete</h2>
        </div>

        {/* Stats grid 2x2 */}
        <div className="mb-5 grid grid-cols-2 gap-3">
          <StatCard
            icon={<Clock className="h-4 w-4 text-blue-400" />}
            label="Total Time"
            value={formatDuration(session.totalDurationMs)}
            valueClass="text-blue-400"
          />
          <StatCard
            icon={<Brain className="h-4 w-4" />}
            label="Average Score"
            value={String(Math.round(session.averageScore))}
            valueClass={scoreColor(session.averageScore)}
          />
          <StatCard
            icon={<Target className="h-4 w-4" />}
            label="Focused"
            value={`${Math.round(session.focusedPercentage)}%`}
            valueClass={scoreColor(session.focusedPercentage)}
          />
          <StatCard
            icon={<AlertTriangle className="h-4 w-4 text-orange-400" />}
            label="Distractions"
            value={String(session.distractionCount)}
            valueClass="text-orange-400"
          />
        </div>

        {/* Timeline chart */}
        <div className="mb-5 rounded-lg border border-gray-800 bg-gray-950 p-3">
          <p className="mb-2 text-xs font-medium text-gray-400">
            Focus Timeline
          </p>
          <SessionTimeline
            snapshots={session.snapshots}
            startTime={session.startTime}
            height={160}
          />
        </div>

        {/* Personal best callout */}
        {newBests && newBests.length > 0 && (
          <div className="mb-5 rounded-lg border border-yellow-800/50 bg-yellow-900/20 px-4 py-3">
            <p className="text-sm font-semibold text-yellow-400">
              New Personal Best{newBests.length > 1 ? "s" : ""}!
            </p>
            <ul className="mt-1 space-y-0.5">
              {newBests.map((best) => (
                <li key={best} className="text-xs text-yellow-300/80">
                  {best}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Done button */}
        <button
          onClick={onDismiss}
          className="w-full rounded-lg bg-gray-800 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700"
        >
          Done
        </button>
      </motion.div>
    </div>
  );
}

/**
 * Individual stat card used within the summary grid.
 */
function StatCard({
  icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-950 p-3">
      <div className="mb-1 flex items-center gap-1.5">
        {icon}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${valueClass ?? "text-white"}`}>
        {value}
      </p>
    </div>
  );
}
