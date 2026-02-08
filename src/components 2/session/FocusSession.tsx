"use client";

import { useRef, useEffect } from "react";
import { useWebcamPermission } from "@/hooks/useWebcamPermission";
import { useHumanDetection } from "@/hooks/useHumanDetection";
import { useFocusScore } from "@/hooks/useFocusScore";
import { useFocusChime } from "@/hooks/useFocusChime";
import { useAICoaching } from "@/hooks/useAICoaching";
import type Human from "@vladmandic/human";
import type { DetectionResult } from "@/lib/detection-types";

// ── Types ──

type RGB = [number, number, number];

interface FocusSessionProps {
  sessionPhase: "running" | "paused";
  onTick: (score: number) => void;
  onDistraction: () => void;
}

// ── Color Helpers ──

function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function getTargetRGB(alignment: number, isCalibrated: boolean): RGB {
  if (!isCalibrated) return [0, 191, 255];
  if (alignment < 25) return [185, 28, 28];
  if (alignment < 50) {
    const t = (alignment - 25) / 25;
    return lerpRGB([239, 68, 68], [249, 115, 22], t);
  }
  if (alignment < 75) {
    const t = (alignment - 50) / 25;
    return lerpRGB([249, 115, 22], [234, 179, 8], t);
  }
  const t = (alignment - 75) / 25;
  return lerpRGB([234, 179, 8], [34, 197, 94], t);
}

// ── Component ──

export default function FocusSession({
  sessionPhase,
  onTick,
  onDistraction,
}: FocusSessionProps) {
  const { state, error, videoRef, requestPermission } = useWebcamPermission();
  const {
    result,
    fps,
    isLoading,
    loadingMessage,
    isReady,
    humanRef,
  } = useHumanDetection(videoRef);

  const {
    score,
    alignmentScore,
    isCalibrated,
    calibrationProgress,
    reset: resetScore,
  } = useFocusScore(result);

  const { chimeCount, reset: resetChime } = useFocusChime(score, {
    dropThreshold: 2,
    chimeIntervalMs: 1500,
  });

  const detectionReadyRef = useRef<number | null>(null);
  if (isReady && detectionReadyRef.current === null) {
    detectionReadyRef.current = Date.now();
  }

  const { reset: resetCoaching } = useAICoaching(
    score,
    chimeCount,
    detectionReadyRef.current,
    { chimesToActivate: 5, cooldownSeconds: 30, enableEscalation: true }
  );

  // Reset scoring state on mount
  const hasResetRef = useRef(false);
  useEffect(() => {
    if (!hasResetRef.current) {
      hasResetRef.current = true;
      resetScore();
      resetChime();
      resetCoaching();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Feed score into session manager
  const prevScoreRef = useRef(score);
  useEffect(() => {
    if (score !== prevScoreRef.current) {
      prevScoreRef.current = score;
      onTick(score);
    }
  }, [score, onTick]);

  // Track chime increases -> distraction events
  const prevChimeCountRef = useRef(0);
  useEffect(() => {
    if (chimeCount > prevChimeCountRef.current) {
      onDistraction();
    }
    prevChimeCountRef.current = chimeCount;
  }, [chimeCount, onDistraction]);

  // ── Permission States ──

  if (state === "idle" || state === "checking") {
    return <PermissionOverlay message="Checking camera access..." />;
  }

  if (state === "prompt") {
    return (
      <PermissionPrompt
        requestPermission={requestPermission}
      />
    );
  }

  if (state === "denied" || state === "error") {
    return (
      <PermissionError error={error} requestPermission={requestPermission} />
    );
  }

  // ── Granted: Render Video + Canvas ──

  const isInCalibration = !isCalibrated || calibrationProgress < 100;

  return (
    <div className="absolute inset-0">
      {/* Video feed -- fills camera box */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover -scale-x-100"
      />

      {/* Canvas overlay for face mesh */}
      <CameraCanvas
        videoRef={videoRef}
        result={result}
        humanRef={humanRef}
        alignmentScore={alignmentScore}
        isCalibrated={isCalibrated}
        fps={fps}
      />

      {/* Scanning effect during calibration */}
      {isInCalibration && (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#C06C4C]/15 to-transparent h-full w-full animate-scan pointer-events-none" />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
            <div className="glass-organic rounded-full px-5 py-2 flex items-center gap-3 animate-calibration-pulse">
              <div className="w-2 h-2 rounded-full bg-[#E07856] animate-pulse" />
              <span className="text-xs font-medium tracking-widest text-[#43302B] uppercase">
                Calibrating... {Math.round(calibrationProgress)}%
              </span>
            </div>
          </div>
          {/* Calibration progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#EBE5DA]">
            <div
              className="h-full bg-gradient-to-r from-[#E07856] to-[#F29E85] transition-all duration-75 ease-linear"
              style={{ width: `${calibrationProgress}%` }}
            />
          </div>
        </>
      )}

      {/* Paused overlay */}
      {sessionPhase === "paused" && (
        <div className="absolute inset-0 bg-[#FDFBF7]/40 backdrop-blur-[2px] flex items-center justify-center z-10">
          <div className="glass-organic rounded-2xl px-6 py-3">
            <span className="text-sm font-medium tracking-widest text-[#43302B] uppercase">
              Paused
            </span>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F5F2EB]/80 backdrop-blur-sm z-20">
          <div className="mb-3 h-8 w-8 animate-spin rounded-full border-3 border-[#EBE5DA] border-t-[#E07856]" />
          <p className="text-xs font-medium text-[#8D7F7D]">{loadingMessage}</p>
        </div>
      )}

      {/* Status indicator (post-calibration) */}
      {!isInCalibration && (
        <div className="absolute top-3 left-3 z-10 glass-organic rounded-full px-3 py-1.5 flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              result && result.faces.length > 0
                ? "bg-green-500"
                : "bg-[#8D7F7D]"
            }`}
          />
          <span className="text-[10px] font-medium text-[#43302B]">
            {result && result.faces.length > 0 ? "Tracking" : "No face"}{" "}
            <span className="text-[#8D7F7D]">{fps} FPS</span>
          </span>
        </div>
      )}

      {/* Dot grid overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#43302B_1px,transparent_1px)] bg-[size:24px_24px] opacity-[0.02] pointer-events-none" />
    </div>
  );
}

// ── Camera Canvas (face mesh overlay) ──

function CameraCanvas({
  videoRef,
  result,
  humanRef,
  alignmentScore,
  isCalibrated,
  fps,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  result: DetectionResult | null;
  humanRef: React.RefObject<Human | null>;
  alignmentScore: number;
  isCalibrated: boolean;
  fps: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentColorRef = useRef<RGB>([0, 191, 255]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const human = humanRef.current;
    if (!canvas || !human || !result) return;

    const video = videoRef.current;
    if (!video) return;

    const drawOverlay = async () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const displayWidth = canvas.parentElement?.clientWidth || video.clientWidth;
      const displayHeight = canvas.parentElement?.clientHeight || video.clientHeight;
      const dpr = window.devicePixelRatio || 1;

      if (
        canvas.width !== displayWidth * dpr ||
        canvas.height !== displayHeight * dpr
      ) {
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
        canvas.style.width = `${displayWidth}px`;
        canvas.style.height = `${displayHeight}px`;
        ctx.scale(dpr, dpr);
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Mirror to match -scale-x-100 on video
      ctx.save();
      ctx.translate(displayWidth, 0);
      ctx.scale(-1, 1);

      // Lerp color
      const targetRGB = getTargetRGB(alignmentScore, isCalibrated);
      const cur = currentColorRef.current;
      currentColorRef.current = [
        cur[0] + (targetRGB[0] - cur[0]) * 1.0,
        cur[1] + (targetRGB[1] - cur[1]) * 1.0,
        cur[2] + (targetRGB[2] - cur[2]) * 1.0,
      ];
      const [lr, lg, lb] = currentColorRef.current.map(Math.round);
      const lerpedPrimary = `rgba(${lr}, ${lg}, ${lb}, 0.8)`;
      const lerpedSecondary = `rgba(${Math.min(lr + 40, 255)}, ${Math.min(lg + 40, 255)}, ${Math.min(lb + 40, 255)}, 0.9)`;

      if (human.draw) {
        Object.assign(human.draw.options, {
          color: lerpedPrimary,
          labelColor: lerpedSecondary,
          lineWidth: 2,
          drawPoints: true,
          drawPolygons: true,
          drawBoxes: false,
          fillPolygons: false,
          useDepth: !isCalibrated,
          useCurves: true,
          drawLabels: !isCalibrated,
          font: 'small-caps 13px "Segoe UI"',
        });
      }

      try {
        const drawResult = {
          face: (result.faces || []).map((face) => ({
            ...face,
            rotation: face.rotation
              ? {
                  angle: face.rotation.angle,
                  matrix: face.rotation.matrix,
                  gaze: face.rotation.gaze,
                }
              : undefined,
          })),
          body: [],
          hand: [],
          gesture: [],
          object: [],
          persons: [],
          performance: result.performance,
          timestamp: result.timestamp,
          width: displayWidth,
          height: displayHeight,
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await human.draw.all(canvas, drawResult as any);
      } catch {
        const face = result.faces[0];
        if (face) {
          const scaleX = displayWidth / (video.videoWidth || 640);
          const scaleY = displayHeight / (video.videoHeight || 480);
          const [x, y, w, h] = face.box;
          ctx.strokeStyle = lerpedPrimary;
          ctx.lineWidth = 2;
          ctx.strokeRect(x * scaleX, y * scaleY, w * scaleX, h * scaleY);
        }
      }

      ctx.restore();
    };

    drawOverlay();
  }, [result, humanRef, videoRef, fps, alignmentScore, isCalibrated]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 w-full h-full z-10"
    />
  );
}

// ── Permission UI (warm themed) ──

function PermissionOverlay({ message }: { message: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F5F2EB]">
      <div className="mb-3 h-8 w-8 animate-spin rounded-full border-3 border-[#EBE5DA] border-t-[#E07856]" />
      <p className="text-xs font-medium text-[#8D7F7D]">{message}</p>
    </div>
  );
}

function PermissionPrompt({
  requestPermission,
}: {
  requestPermission: () => Promise<void>;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#F5F2EB]">
      <div className="text-center space-y-4 max-w-xs px-6">
        <div className="mx-auto w-14 h-14 rounded-full bg-[#E07856]/10 flex items-center justify-center">
          <svg
            className="h-7 w-7 text-[#E07856]"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
            />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-[#43302B]">
          Camera access needed
        </h3>
        <p className="text-xs text-[#8D7F7D]">
          Video is processed in your browser and never leaves your device.
        </p>
        <button
          onClick={requestPermission}
          className="w-full rounded-full animate-gradient-sweep px-4 py-2.5 text-sm font-semibold text-[#FDFBF7] shadow-lg shadow-[#E07856]/20"
        >
          Enable Camera
        </button>
      </div>
    </div>
  );
}

function PermissionError({
  error,
  requestPermission,
}: {
  error: string | null;
  requestPermission: () => Promise<void>;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#F5F2EB]">
      <div className="text-center space-y-3 max-w-xs px-6">
        <div className="mx-auto w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
          <svg
            className="h-7 w-7 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
        <p className="text-xs text-red-600">{error || "Camera error"}</p>
        <button
          onClick={requestPermission}
          className="w-full rounded-full bg-[#43302B] px-4 py-2.5 text-sm font-semibold text-[#FDFBF7]"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
