"use client";

import { Focus } from "lucide-react";
import type { StoredSession } from "@/lib/session-types";
import SessionTimeline from "./SessionTimeline";

interface SessionHistoryProps {
  sessions: StoredSession[];
}

/**
 * Format milliseconds as mm:ss string.
 */
function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
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
 * Scrollable list of past sessions with mini sparkline charts and key metrics.
 *
 * - Empty state: encouraging message with Focus icon
 * - Each row: date/time, mini SessionTimeline (hidden below lg), duration, avg score, focused %
 * - Sorted most recent first
 * - Max height with overflow scroll
 */
export default function SessionHistory({ sessions }: SessionHistoryProps) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-warmBorder/50 bg-warmSurface/50 p-8 text-center">
        <Focus className="mx-auto mb-3 h-10 w-10 text-warmBrownMuted" />
        <p className="text-sm text-warmBrownMuted">
          No sessions yet. Start your first focus session!
        </p>
      </div>
    );
  }

  // Sort by startTime descending (most recent first)
  const sorted = [...sessions].sort((a, b) => b.startTime - a.startTime);

  return (
    <div className="space-y-1">
      <h3 className="mb-2 text-sm font-medium text-warmBrownMuted">
        Session History
      </h3>
      <div className="max-h-[400px] space-y-2 overflow-y-auto pr-1">
        {sorted.map((session) => (
          <SessionRow key={session.id} session={session} />
        ))}
      </div>
    </div>
  );
}

/**
 * Individual session row with date, mini timeline, and metrics.
 */
function SessionRow({ session }: { session: StoredSession }) {
  const date = new Date(session.startTime);

  // Format: "Mon, Feb 8"
  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  // Format: "2:30 PM"
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div className="group flex items-center gap-3 rounded-lg border border-warmBorder bg-warmSurface p-3 transition-colors hover:border-warmCoral/30">
      {/* Left: Date and time */}
      <div className="w-24 shrink-0">
        <p className="text-sm font-medium text-warmBrown">{dateStr}</p>
        <p className="text-xs text-warmBrownMuted">{timeStr}</p>
      </div>

      {/* Center: Mini timeline chart (hidden below lg breakpoint) */}
      <div className="hidden min-w-0 flex-1 lg:block">
        <SessionTimeline
          snapshots={session.snapshots}
          startTime={session.startTime}
          height={60}
        />
      </div>

      {/* Right: Key metrics */}
      <div className="flex shrink-0 items-center gap-4 text-right">
        <div>
          <p className="text-sm font-medium text-warmBrown">
            {formatDuration(session.totalDurationMs)}
          </p>
          <p className="text-xs text-warmBrownMuted">duration</p>
        </div>
        <div>
          <p className={`text-sm font-medium ${scoreColor(session.averageScore)}`}>
            {Math.round(session.averageScore)}
          </p>
          <p className="text-xs text-warmBrownMuted">avg score</p>
        </div>
        <div>
          <p className="text-sm font-medium text-blue-400">
            {Math.round(session.focusedPercentage)}%
          </p>
          <p className="text-xs text-warmBrownMuted">focused</p>
        </div>
      </div>
    </div>
  );
}
