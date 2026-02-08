"use client";

import { useRef, useEffect } from "react";
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
// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DetectionProviderProps {
  /** Current session phase: "running" or "paused" */
  sessionPhase: "running" | "paused";
  /** Called with focus score on each 3-second tick (feeds into session manager) */
  onTick: (score: number) => void;
  /** Called when a new distraction event is detected (chime count increase) */
  onDistraction: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DetectionProvider({
  sessionPhase,
  onTick,
  onDistraction,
}: DetectionProviderProps) {
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
  const { score, history, config, updateConfig, isCalibrated, calibrationProgress, reset: resetScore } = useFocusScore(result);

  // Focus chime alert system (plays when score drops significantly)
  const { chimeCount, reset: resetChime } = useFocusChime(score, {
    dropThreshold: 2,
    chimeIntervalMs: 1500,
  });

  // Use detection readiness timestamp for coaching session start reference
  const detectionReadyRef = useRef<number | null>(null);
  if (isReady && detectionReadyRef.current === null) {
    detectionReadyRef.current = Date.now();
  }

  // AI voice coaching (activates after 5 chimes)
  const { isPlaying: isCoachingActive, currentTier, currentMessage, reset: resetCoaching } = useAICoaching(
    score,
    chimeCount,
    detectionReadyRef.current,
    { chimesToActivate: 5, cooldownSeconds: 30, enableEscalation: true }
  );

  // ---------------------------------------------------------------------------
  // Session integration: reset on mount, feed scores, track distractions
  // ---------------------------------------------------------------------------

  // Reset all scoring state on first mount (new session starts fresh at 100)
  const hasResetRef = useRef(false);
  useEffect(() => {
    if (!hasResetRef.current) {
      hasResetRef.current = true;
      resetScore();
      resetChime();
      resetCoaching();
      console.log("[DetectionProvider] Scoring state reset for new session");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Feed focus score into session manager on every score change.
  // The session reducer's TICK action guards on phase === "running",
  // so we always call onTick -- the reducer ignores it when paused.
  const prevScoreRef = useRef(score);
  useEffect(() => {
    if (score !== prevScoreRef.current) {
      prevScoreRef.current = score;
      onTick(score);
    }
  }, [score, onTick]);

  // Track chime count increases to dispatch DISTRACTION events.
  // When chimeCount increases from the previous value, call onDistraction.
  const prevChimeCountRef = useRef(0);
  useEffect(() => {
    if (chimeCount > prevChimeCountRef.current) {
      onDistraction();
    }
    prevChimeCountRef.current = chimeCount;
  }, [chimeCount, onDistraction]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const faceDetected = result !== null && result.faces.length > 0;
  const isInCalibrationPeriod = !isCalibrated || calibrationProgress < 100;

  // Debug: Log calibration state changes
  useEffect(() => {
    console.log(`[DetectionProvider] Calibration state: isCalibrated=${isCalibrated}, progress=${calibrationProgress.toFixed(1)}%, inCalibrationPeriod=${isInCalibrationPeriod}`);
  }, [isCalibrated, calibrationProgress, isInCalibrationPeriod]);

  return (
    <PermissionGate
      state={state}
      error={error}
      requestPermission={requestPermission}
    >
      <div className="flex min-h-screen flex-col pt-2">
        <PrivacyIndicator />

        {/* Main container - layout changes based on calibration state */}
        <div className={`mx-auto flex w-full ${isInCalibrationPeriod ? 'max-w-3xl' : 'max-w-5xl'} flex-1 flex-col gap-6 p-4 ${isInCalibrationPeriod ? 'items-center justify-center' : 'lg:flex-row'}`}>
          {/* Left column: Webcam (+ detection status after calibration) */}
          <div className={`flex flex-col gap-3 ${isInCalibrationPeriod ? 'w-full max-w-2xl' : 'lg:flex-1 lg:min-h-0'}`}>
            {/* WebcamView - ALWAYS RENDERED to maintain video stream */}
            <WebcamView
              videoRef={videoRef}
              result={result}
              humanRef={humanRef}
              isLoading={isLoading}
              loadingMessage={loadingMessage}
              fps={fps}
              focusScore={score}
              isCalibrated={isCalibrated}
            />

            {/* Progress bar - only during calibration */}
            {isInCalibrationPeriod && (
              <div className="space-y-2">
                <div className="h-2 overflow-hidden rounded-full bg-gray-800 shadow-inner">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-75 ease-linear"
                    style={{ width: `${calibrationProgress}%` }}
                  />
                </div>
                <p className="text-center text-sm text-gray-400">
                  {calibrationProgress < 100 ? `Calibrating... ${Math.round(calibrationProgress)}%` : 'Calibration complete!'}
                </p>
              </div>
            )}

            {/* Detection status bar - only after calibration */}
            {!isInCalibrationPeriod && (
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

                {/* Session phase indicator */}
                {sessionPhase === "paused" && (
                  <>
                    <span className="text-gray-500">|</span>
                    <span className="text-yellow-400 text-xs font-medium">SCORING PAUSED</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right column: Analytics - only after calibration */}
          {!isInCalibrationPeriod && (
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
                sessionStartTime={detectionReadyRef.current ?? Date.now()}
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
          )}
        </div>

        {/* Performance monitoring panel - only show after calibration */}
        {isReady && !isInCalibrationPeriod && (
          <MonitoringPanel
            fps={fps}
            numTensors={numTensors}
            numBytes={numBytes}
            isLeaking={isLeaking}
            detectionStartTime={detectionReadyRef.current}
          />
        )}
      </div>
    </PermissionGate>
  );
}
