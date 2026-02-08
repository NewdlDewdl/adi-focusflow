"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { Play, Eye } from "lucide-react";
import { useSessionManager } from "@/hooks/useSessionManager";
import type { StoredSession } from "@/lib/session-types";
import { loadSessions, calculateStreak, getPersonalBests } from "@/lib/session-storage";
import SessionControls from "@/components/session/SessionControls";
import SessionSummary from "@/components/session/SessionSummary";
import styles from "@/styles/warm-theme.module.css";

/**
 * Dynamically import DetectionProvider with SSR disabled.
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

interface DashboardData {
  sessions: StoredSession[];
  streak: number;
  personalBests: ReturnType<typeof getPersonalBests>;
}

export default function SessionPage() {
  const { session, start, pause, resume, end, tick, recordDistraction, reset } =
    useSessionManager();
  const heroTitleRef = useRef<HTMLHeadingElement>(null);

  const [lastCompletedSession, setLastCompletedSession] =
    useState<StoredSession | null>(null);
  const [newBests, setNewBests] = useState<string[]>([]);
  const [tooShortMessage, setTooShortMessage] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  // Cursor follow effect for hero title
  useEffect(() => {
    const heroTitle = heroTitleRef.current;
    if (!heroTitle) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = heroTitle.getBoundingClientRect();
      heroTitle.style.setProperty('--x', `${e.clientX - rect.left}px`);
      heroTitle.style.setProperty('--y', `${e.clientY - rect.top}px`);
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const refreshDashboardData = useCallback(() => {
    const sessions = loadSessions();
    const streak = calculateStreak(sessions);
    const personalBests = getPersonalBests(sessions);
    setDashboardData({ sessions, streak, personalBests });
    return { sessions, personalBests };
  }, []);

  useEffect(() => {
    refreshDashboardData();
  }, [refreshDashboardData]);

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

  const handleStart = useCallback(() => {
    setTooShortMessage(null);
    setLastCompletedSession(null);
    setNewBests([]);
    refreshDashboardData();
    start();
  }, [start, refreshDashboardData]);

  const handleEnd = useCallback(() => {
    const previousBests = dashboardData?.personalBests ?? {
      longestFocusStreakMs: 0,
      highestScore: 0,
      longestSessionMs: 0,
    };

    const completed = end();
    if (completed === null) {
      setTooShortMessage("Session too short (minimum 60 seconds)");
      setTimeout(() => setTooShortMessage(null), 3000);
      return;
    }

    const bests = checkNewBests(completed, previousBests);
    setNewBests(bests);
    setLastCompletedSession(completed);
  }, [end, dashboardData, checkNewBests]);

  const handleDismiss = useCallback(() => {
    setLastCompletedSession(null);
    setNewBests([]);
    reset();
    refreshDashboardData();
  }, [refreshDashboardData, reset]);

  useEffect(() => {
    if (session.phase === "running" || session.phase === "paused") {
      const handler = (e: BeforeUnloadEvent) => {
        e.preventDefault();
      };
      window.addEventListener("beforeunload", handler);
      return () => window.removeEventListener("beforeunload", handler);
    }
  }, [session.phase]);

  const isSessionActive = session.phase === "running" || session.phase === "paused";
  const showSummary = lastCompletedSession !== null;

  return (
    <div className="min-h-screen bg-warmBeige text-warmBrown flex flex-col items-center justify-center relative overflow-hidden font-sans selection:bg-warmCoral/20 selection:text-warmBrown">
      {/* Organic Background Elements */}
      <div className={`absolute inset-0 ${styles.bgTexture} z-0 pointer-events-none mix-blend-multiply`} />
      <div className={`absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-[#E8DCC4] rounded-full blur-[100px] opacity-60 pointer-events-none ${styles.animateFloat}`} />
      <div className={`absolute bottom-[-10%] right-[-5%] w-[700px] h-[700px] bg-[#D8E2DC] rounded-full blur-[120px] opacity-60 pointer-events-none ${styles.animateFloatDelayed}`} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#F2E8DE] rounded-full blur-[80px] opacity-40 pointer-events-none" />

      {/* Session Summary Overlay */}
      {showSummary && lastCompletedSession && (
        <div className="fixed inset-0 z-50">
          <SessionSummary
            session={lastCompletedSession}
            onDismiss={handleDismiss}
            newBests={newBests.length > 0 ? newBests : undefined}
          />
        </div>
      )}

      {/* Main Content */}
      <main className="relative z-10 w-full max-w-[1280px] flex flex-col items-center px-6 pt-20 pb-4 md:pt-28 md:pb-6 gap-10">
        {/* Hero Title - Only show when idle */}
        {session.phase === "idle" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-3"
          >
            <h1
              ref={heroTitleRef}
              className={`text-6xl md:text-8xl font-['Zodiak'] font-bold tracking-tight cursor-default drop-shadow-sm ${styles.heroTitle}`}
            >
              Focus Flow
            </h1>
            <p className="text-xs md:text-sm tracking-[0.2em] uppercase font-normal text-[#8D7F7D] font-['Plus_Jakarta_Sans']">
              AI - Powered Focus Tracking
            </p>
          </motion.div>
        )}

        {/* Camera Preview Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="relative w-full max-w-[832px] aspect-[4/3] bg-[#F5F2EB] rounded-[40px] border-[6px] border-[#FFFFFF]/80 ring-1 ring-[#EBE5DA] shadow-[0_20px_40px_-12px_rgba(67,48,43,0.1)] overflow-hidden"
        >
          {/* Idle State - Landing Page Content */}
          {session.phase === "idle" && (
            <div className="absolute inset-0 flex flex-col items-center justify-between px-8 py-10 text-center z-10">
              <div className="flex flex-col items-center gap-4">
                <div className={`inline-flex items-center gap-2 rounded-full border border-warmCoral/20 ${styles.glassOrganic} px-4 py-1.5 text-xs text-warmBrownMuted`}>
                  <Eye className="h-3.5 w-3.5 text-warmCoral" />
                  Built for Hacklahoma 2026
                </div>

                <h2 className="text-3xl md:text-5xl font-bold leading-tight">
                  <span className="text-warmBrown">Your focus, </span>
                  <span className={`${styles.animateShimmer} bg-gradient-to-r from-warmCoral via-warmCoralLight to-warmCoral bg-clip-text text-transparent`}>
                    tracked privately
                  </span>
                </h2>

                <p className="text-base md:text-lg text-warmBrownMuted max-w-2xl leading-relaxed">
                  Real-time AI coaching that never records. Your webcam stays local, your data stays yours.
                </p>
              </div>

              {/* Begin Session Button */}
              <div className="w-full max-w-[384px]">
                <button
                  onClick={handleStart}
                  className="group relative w-full h-12 flex items-center justify-center rounded-full transition-all duration-[800ms] hover:scale-[1.02] cursor-pointer"
                >
                  <div className={`absolute -inset-1 rounded-full opacity-40 blur-md transition-opacity duration-300 group-hover:opacity-70 ${styles.animateGradientSweep}`} />
                  <div className={`absolute inset-0 rounded-full ${styles.animateGradientSweep} shadow-xl shadow-[#E07856]/20`} />
                  <div className={`absolute inset-0 ${styles.bgTexture} mix-blend-overlay opacity-30 rounded-full pointer-events-none`} />

                  <span className="relative z-10 flex items-center justify-center gap-3 text-[#FDFBF7] font-semibold text-lg tracking-wide">
                    <Play className="h-5 w-5 fill-current" />
                    Begin Session
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Active Session - Detection Provider */}
          {isSessionActive && (
            <div className="absolute inset-0">
              <DetectionProvider
                sessionPhase={session.phase as "running" | "paused"}
                onTick={tick}
                onDistraction={recordDistraction}
              />
            </div>
          )}

          {/* Dot Grid Overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(#43302B_1px,transparent_1px)] bg-[size:24px_24px] opacity-[0.03] pointer-events-none" />

          {/* Scanning Effect */}
          <div className={`absolute inset-0 bg-gradient-to-b from-transparent via-[#C06C4C]/10 to-transparent h-full w-full ${styles.animateScan} pointer-events-none`} />
        </motion.div>

        {/* Session Controls - Show during active session */}
        {isSessionActive && (
          <div className="w-full max-w-[832px]">
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
        )}

        {/* Too Short Message */}
        {tooShortMessage && (
          <div className="mx-auto max-w-md rounded-lg border border-warmBorder bg-warmSurface px-4 py-2 text-center text-sm text-warmCoral">
            {tooShortMessage}
          </div>
        )}
      </main>
    </div>
  );
}
