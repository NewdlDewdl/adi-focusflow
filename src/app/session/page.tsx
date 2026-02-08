"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useSessionManager } from "@/hooks/useSessionManager";
import type { StoredSession } from "@/lib/session-types";
import { loadSessions, calculateStreak, getPersonalBests } from "@/lib/session-storage";
import SessionControls from "@/components/session/SessionControls";
import SessionSummary from "@/components/session/SessionSummary";
import StreakBadge from "@/components/session/StreakBadge";
import PersonalBests from "@/components/session/PersonalBests";
import SessionHistory from "@/components/session/SessionHistory";

/**
 * Dynamically import DetectionProvider with SSR disabled.
 * Only mounted when a session is running or paused.
 */
const DetectionProvider = dynamic(
  () => import("@/components/detection/DetectionProvider"),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-warmBorder border-t-warmCoral" />
          <p className="text-sm text-warmBrownMuted">Loading FocusFlow...</p>
        </div>
      </div>
    ),
  }
);

/**
 * Dashboard data derived from stored sessions.
 * Refreshed on mount and after each session dismiss.
 * Plan 04-03 will consume this for StreakBadge, PersonalBests, SessionHistory.
 */
interface DashboardData {
  sessions: StoredSession[];
  streak: number;
  personalBests: ReturnType<typeof getPersonalBests>;
}

/**
 * Session page -- orchestrates the complete session lifecycle.
 *
 * UI states:
 *   idle  -> Pre-session dashboard: streak badge, personal bests, CTA, session history
 *   running/paused -> Control bar + DetectionProvider (webcam + scoring)
 *   ended -> SessionSummary overlay
 *
 * Detection pipeline is only mounted during running/paused to save resources.
 * beforeunload guard prevents accidental navigation during active sessions.
 */
export default function SessionPage() {
  const { session, start, pause, resume, end, tick, recordDistraction, reset } =
    useSessionManager();

  const [lastCompletedSession, setLastCompletedSession] =
    useState<StoredSession | null>(null);

  const [newBests, setNewBests] = useState<string[]>([]);
  const [tooShortMessage, setTooShortMessage] = useState<string | null>(null);

  // Dashboard data (refreshed on mount and after dismiss)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );

  /**
   * Refresh dashboard data from localStorage.
   * Called on mount and after session dismiss.
   */
  const refreshDashboardData = useCallback(() => {
    const sessions = loadSessions();
    const streak = calculateStreak(sessions);
    const personalBests = getPersonalBests(sessions);
    setDashboardData({ sessions, streak, personalBests });
    return { sessions, personalBests };
  }, []);

  // Load dashboard data on mount
  useEffect(() => {
    refreshDashboardData();
  }, [refreshDashboardData]);

  /**
   * Check if a completed session set any new personal bests.
   */
  const checkNewBests = useCallback(
    (completed: StoredSession, previousBests: ReturnType<typeof getPersonalBests>): string[] => {
      const bests: string[] = [];
      if (completed.peakScore > previousBests.highestScore) {
        bests.push(`Highest score: ${completed.peakScore}`);
      }
      if (completed.longestFocusStreakMs > previousBests.longestFocusStreakMs) {
        const mins = Math.floor(completed.longestFocusStreakMs / 60000);
        const secs = Math.floor((completed.longestFocusStreakMs % 60000) / 1000);
        bests.push(`Longest focus streak: ${mins}m ${secs}s`);
      }
      if (completed.totalDurationMs > previousBests.longestSessionMs) {
        const mins = Math.floor(completed.totalDurationMs / 60000);
        const secs = Math.floor((completed.totalDurationMs % 60000) / 1000);
        bests.push(`Longest session: ${mins}m ${secs}s`);
      }
      return bests;
    },
    []
  );

  // Handle Start: begin session
  const handleStart = useCallback(() => {
    setTooShortMessage(null);
    setLastCompletedSession(null);
    setNewBests([]);
    // Capture current personal bests BEFORE starting (for comparison after)
    refreshDashboardData();
    start();
  }, [start, refreshDashboardData]);

  // Handle End: finalize session, check for personal bests
  const handleEnd = useCallback(() => {
    // Capture bests before end() persists the new session
    const previousBests = dashboardData?.personalBests ?? {
      longestFocusStreakMs: 0,
      highestScore: 0,
      longestSessionMs: 0,
    };

    const completed = end();
    if (completed === null) {
      // Session too short
      setTooShortMessage("Session too short (minimum 60 seconds)");
      setTimeout(() => setTooShortMessage(null), 3000);
      return;
    }

    // Check personal bests
    const bests = checkNewBests(completed, previousBests);
    setNewBests(bests);
    setLastCompletedSession(completed);
  }, [end, dashboardData, checkNewBests]);

  // Handle Dismiss: return to idle, refresh dashboard
  const handleDismiss = useCallback(() => {
    setLastCompletedSession(null);
    setNewBests([]);
    reset(); // Reset session phase to idle
    refreshDashboardData();
  }, [refreshDashboardData, reset]);

  // beforeunload guard: warn when navigating away during active session
  useEffect(() => {
    if (session.phase === "running" || session.phase === "paused") {
      const handler = (e: BeforeUnloadEvent) => {
        e.preventDefault();
      };
      window.addEventListener("beforeunload", handler);
      return () => window.removeEventListener("beforeunload", handler);
    }
  }, [session.phase]);

  // Determine if session is active (detection pipeline should be mounted)
  const isSessionActive =
    session.phase === "running" || session.phase === "paused";

  // Show summary overlay when session has ended and we have data
  const showSummary = lastCompletedSession !== null;

  return (
    <main className="min-h-screen bg-warmBeige text-warmBrown">
      {/* Header */}
      <header className="fixed left-0 top-0 z-40 w-full border-b border-warmBorder/50 bg-warmBeige/80 backdrop-blur-sm">
        <div className="mx-auto flex h-12 max-w-4xl items-center px-4">
          <h1 className="text-lg font-bold tracking-tight">
            <span className="text-warmCoral">Focus</span>
            <span className="text-warmBrown">Flow</span>
          </h1>
        </div>
      </header>

      <div className="pt-14">
        {/* Pre-session dashboard (idle state) */}
        {session.phase === "idle" && !showSummary && (
          <div className="mx-auto max-w-2xl space-y-6 px-4 pt-6">
            {/* Streak Badge */}
            <div className="flex justify-center">
              <StreakBadge streak={dashboardData?.streak ?? 0} />
            </div>

            {/* Personal Bests */}
            {dashboardData && (
              <PersonalBests bests={dashboardData.personalBests} />
            )}

            {/* Start CTA */}
            <SessionControls
              phase={session.phase}
              startTime={session.startTime}
              pausedAt={session.pausedAt}
              totalPausedMs={session.totalPausedMs}
              focusedMs={session.focusedMs}
              distractionCount={session.distractionCount}
              onStart={handleStart}
              onPause={pause}
              onResume={resume}
              onEnd={handleEnd}
            />

            {/* Too short message */}
            {tooShortMessage && (
              <div className="mx-auto max-w-md rounded-lg border border-warmBorder bg-warmSurface px-4 py-2 text-center text-sm text-warmCoral">
                {tooShortMessage}
              </div>
            )}

            {/* Session History */}
            {dashboardData && (
              <SessionHistory sessions={dashboardData.sessions} />
            )}
          </div>
        )}

        {/* Active session: controls bar + detection pipeline */}
        {isSessionActive && !showSummary && (
          <>
            <div className="px-4 pt-4">
              <SessionControls
                phase={session.phase}
                startTime={session.startTime}
                pausedAt={session.pausedAt}
                totalPausedMs={session.totalPausedMs}
                focusedMs={session.focusedMs}
                distractionCount={session.distractionCount}
                onStart={handleStart}
                onPause={pause}
                onResume={resume}
                onEnd={handleEnd}
              />
            </div>

            {/* Too short message */}
            {tooShortMessage && (
              <div className="mx-auto mt-4 max-w-md rounded-lg border border-yellow-800/50 bg-yellow-900/20 px-4 py-2 text-center text-sm text-yellow-400">
                {tooShortMessage}
              </div>
            )}

            <DetectionProvider
              sessionPhase={session.phase as "running" | "paused"}
              onTick={tick}
              onDistraction={recordDistraction}
            />
          </>
        )}

        {/* Session Summary overlay */}
        {showSummary && lastCompletedSession && (
          <SessionSummary
            session={lastCompletedSession}
            onDismiss={handleDismiss}
            newBests={newBests.length > 0 ? newBests : undefined}
          />
        )}
      </div>
    </main>
  );
}
