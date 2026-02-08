"use client";

import { useRef } from "react";
import { useWebcamPermission } from "@/hooks/useWebcamPermission";
import { useHumanDetection } from "@/hooks/useHumanDetection";
import { useTensorMonitor } from "@/hooks/useTensorMonitor";
import { useFocusScore } from "@/hooks/useFocusScore";
import { useFocusChime } from "@/hooks/useFocusChime";
import { useAICoaching } from "@/hooks/useAICoaching";
import PermissionGate from "@/components/detection/PermissionGate";
import NudgeIndicator from "@/components/coaching/NudgeIndicator";
import PrivacyIndicator from "@/components/detection/PrivacyIndicator";
import WebcamView from "@/components/detection/WebcamView";
import MonitoringPanel from "@/components/detection/MonitoringPanel";
import FocusScoreRing from "@/components/scoring/FocusScoreRing";
import FocusSparkline from "@/components/scoring/FocusSparkline";
import StatCards from "@/components/scoring/StatCards";
import SensitivitySlider from "@/components/scoring/SensitivitySlider";

export default function DetectionProvider() {
  const { state, error, videoRef, requestPermission } = useWebcamPermission();
  const {
    result,
    fps,
    tensorCount,
    isLoading,
    loadingMessage,
    isReady,
    humanRef,
  } = useHumanDetection(videoRef);
  const { numTensors, numBytes, isLeaking } = useTensorMonitor(humanRef);

  // Focus scoring pipeline
  const { score, history, config, updateConfig } = useFocusScore(result);

  // Track when detection becomes ready for uptime and session duration
  const detectionStartRef = useRef<number | null>(null);
  if (isReady && detectionStartRef.current === null) {
    detectionStartRef.current = Date.now();
  }

  // Focus chime alert system (plays when score drops significantly)
  const { chimeCount } = useFocusChime(score, {
    dropThreshold: 5,
    recoveryAmount: 1,
    chimeIntervalMs: 3000, // Play every 3 seconds
  });

  // AI voice coaching (activates after 5 chimes)
  const { isPlaying: isCoachingActive, currentTier, currentMessage } = useAICoaching(
    score,
    chimeCount,
    detectionStartRef.current,
    { chimesToActivate: 5, cooldownSeconds: 30, enableEscalation: true }
  );

  const faceDetected = result !== null && result.faces.length > 0;

  return (
    <PermissionGate
      state={state}
      error={error}
      requestPermission={requestPermission}
    >
      <div className="flex min-h-screen flex-col pt-14">
        <PrivacyIndicator />

        {/* Main content: two-column on large screens, stacked on small */}
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 lg:flex-row">
          {/* Left column: Webcam + detection status */}
          <div className="flex flex-col gap-3 lg:flex-1">
            <WebcamView
              videoRef={videoRef}
              result={result}
              humanRef={humanRef}
              isLoading={isLoading}
              loadingMessage={loadingMessage}
              fps={fps}
            />

            {/* Detection status bar */}
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    faceDetected ? "bg-green-500" : "bg-gray-500"
                  }`}
                />
                <span className="text-gray-300">
                  {faceDetected ? "Face detected" : "No face detected"}
                </span>
              </span>

              {isReady && (
                <>
                  <span className="text-gray-500">|</span>
                  <span className="font-mono text-gray-400">{fps} FPS</span>
                  <span className="text-gray-500">|</span>
                  <span className="font-mono text-gray-400">
                    {tensorCount} tensors
                  </span>
                </>
              )}

              {isLoading && (
                <span className="text-blue-400">{loadingMessage}</span>
              )}
            </div>
          </div>

          {/* Right column: Score ring, sparkline, stat cards, sensitivity */}
          <div className="flex flex-col items-center gap-5 lg:w-[320px] lg:shrink-0">
            {/* AI Coaching Indicator */}
            <NudgeIndicator
              isActive={isCoachingActive}
              tier={currentTier}
              message={currentMessage}
            />

            {/* Focus Score Ring */}
            <FocusScoreRing score={score} size={200} strokeWidth={12} />

            {/* Sparkline */}
            <div className="w-full rounded-lg border border-gray-800 bg-gray-900 p-3">
              <p className="mb-2 text-xs font-medium text-gray-400">
                Score Trend
              </p>
              <FocusSparkline data={history} height={60} />
            </div>

            {/* Stat Cards */}
            <div className="w-full">
              <StatCards
                score={score}
                sessionStartTime={detectionStartRef.current ?? Date.now()}
                history={history}
              />
            </div>

            {/* Sensitivity Slider */}
            <div className="w-full">
              <SensitivitySlider
                value={config.emaAlpha}
                onChange={(alpha) => updateConfig({ emaAlpha: alpha })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Performance monitoring panel */}
      {isReady && (
        <MonitoringPanel
          fps={fps}
          numTensors={numTensors}
          numBytes={numBytes}
          isLeaking={isLeaking}
          detectionStartTime={detectionStartRef.current}
        />
      )}
    </PermissionGate>
  );
}
