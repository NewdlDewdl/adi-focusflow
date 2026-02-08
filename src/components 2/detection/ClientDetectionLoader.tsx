"use client";

import dynamic from "next/dynamic";

const DetectionProvider = dynamic(
  () => import("@/components/detection/DetectionProvider"),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
          <p className="text-sm text-gray-500">Loading FocusFlow...</p>
        </div>
      </div>
    ),
  }
);

interface ClientDetectionLoaderProps {
  sessionPhase: "running" | "paused";
  onTick: (score: number) => void;
  onDistraction: () => void;
}

/**
 * Dynamic loader for DetectionProvider with SSR disabled.
 * Note: As of Plan 04-02, the session page imports DetectionProvider
 * directly via its own dynamic() call. This component is kept for
 * backward compatibility but is not actively used.
 */
export default function ClientDetectionLoader({
  sessionPhase,
  onTick,
  onDistraction,
}: ClientDetectionLoaderProps) {
  return (
    <DetectionProvider
      sessionPhase={sessionPhase}
      onTick={onTick}
      onDistraction={onDistraction}
    />
  );
}
