"use client";

import { useEffect, useState } from "react";

interface CalibrationIndicatorProps {
  progress: number; // 0-100
}

/**
 * Shows a calibration progress indicator during the initial setup period.
 * Displays an animated progress bar and message.
 */
export default function CalibrationIndicator({ progress }: CalibrationIndicatorProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(10);

  useEffect(() => {
    // Calculate seconds remaining based on progress (10 seconds total)
    const remaining = Math.ceil((100 - progress) / 10);
    setSecondsRemaining(Math.max(0, remaining));
  }, [progress]);

  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-6 rounded-xl border-2 border-blue-500/30 bg-gradient-to-br from-gray-900 to-gray-800 p-8 shadow-2xl">
      <div className="flex flex-col items-center gap-3">
        {/* Animated spinner */}
        <div className="relative">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-blue-400" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-blue-400">{secondsRemaining}s</span>
          </div>
        </div>
        <h3 className="text-xl font-semibold text-gray-100">
          Calibrating Focus Tracking
        </h3>
      </div>

      {/* Progress bar */}
      <div className="w-full space-y-3">
        <div className="relative h-3 overflow-hidden rounded-full bg-gray-800 shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-blue-400 to-purple-500 shadow-lg transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          >
            {/* Animated shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          </div>
        </div>
        <div className="flex justify-between text-sm">
          <span className="font-medium text-blue-400">{Math.round(progress)}%</span>
          <span className="text-gray-400">
            {progress >= 100 ? "Complete!" : `${secondsRemaining}s remaining`}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-sm font-medium text-gray-300">
          👀 Please look directly at your screen
        </p>
        <p className="text-xs text-gray-500">
          Learning your natural gaze pattern for accurate focus detection
        </p>
      </div>
    </div>
  );
}
