"use client";

import { useRef, useEffect, useState } from "react";
import type Human from "@vladmandic/human";
import type { DetectionResult } from "@/lib/detection-types";

interface WebcamViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  result: DetectionResult | null;
  humanRef: React.RefObject<Human | null>;
  isLoading: boolean;
  loadingMessage: string;
  fps: number;
}

/**
 * Video element with canvas overlay for detection visualization.
 * Uses human.draw.all() for face mesh/bounding box overlay plus
 * custom text overlay for head pose and gaze metrics.
 */
export default function WebcamView({
  videoRef,
  result,
  humanRef,
  isLoading,
  loadingMessage,
  fps,
}: WebcamViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showVideo, setShowVideo] = useState(true);

  // Add event listeners to track video readiness
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      console.log('[WebcamView] Video metadata loaded:', {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        readyState: video.readyState,
      });
    };

    const handleLoadedData = () => {
      console.log('[WebcamView] Video data loaded, readyState:', video.readyState);
    };

    const handleCanPlay = () => {
      console.log('[WebcamView] Video can play, readyState:', video.readyState);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [videoRef]);

  // Draw detection overlay whenever result changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const human = humanRef.current;
    if (!canvas || !human || !result) return;

    const video = videoRef.current;
    if (!video) return;

    const drawOverlay = async () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Sync canvas size with video display size
      const displayWidth = video.clientWidth;
      const displayHeight = video.clientHeight;
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
      }

      // Clear previous frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw mirrored to match the -scale-x-100 on the video
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);

      // Use Human.js draw API for bounding boxes, face mesh, gaze arrows
      try {
        // Build a result object compatible with human.draw.all()
        const drawResult = {
          face: (result.faces || []).map((face) => ({
            ...face,
            // human.draw expects 'rotation' with nested angle/gaze
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
          width: video.videoWidth,
          height: video.videoHeight,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await human.draw.all(canvas, drawResult as any);
      } catch {
        // Fallback: if human.draw fails, draw basic bounding box
        const face = result.faces[0];
        if (face) {
          const scaleX = canvas.width / (video.videoWidth || 640);
          const scaleY = canvas.height / (video.videoHeight || 480);
          const [x, y, w, h] = face.box;
          ctx.strokeStyle = "rgba(0, 255, 128, 0.8)";
          ctx.lineWidth = 2;
          ctx.strokeRect(x * scaleX, y * scaleY, w * scaleX, h * scaleY);
        }
      }

      ctx.restore();

      // Draw custom text overlay (not mirrored -- text should read normally)
      drawMetricsOverlay(ctx, result, fps);
    };

    drawOverlay();
  }, [result, humanRef, videoRef, fps]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
      {/* Video feed -- always in DOM for detection, visibility toggled */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`block h-auto w-full max-w-[640px] -scale-x-100 ${
          showVideo ? "" : "invisible"
        }`}
      />

      {/* Canvas overlay for detection drawings */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute left-0 top-0 h-full w-full"
      />

      {/* Toggle video feed visibility */}
      <button
        onClick={() => setShowVideo((prev) => !prev)}
        className="absolute right-2 top-2 z-10 rounded-lg bg-gray-800/80 px-2.5 py-1.5 text-xs font-medium text-gray-300 backdrop-blur-sm transition-colors hover:bg-gray-700/80 hover:text-white"
        aria-label={showVideo ? "Hide video feed" : "Show video feed"}
      >
        {showVideo ? "Hide Video" : "Show Video"}
      </button>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-gray-600 border-t-blue-400" />
          <p className="text-sm font-medium text-white">{loadingMessage}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Draw head pose, gaze, and confidence text overlay on the canvas.
 * Positioned in the top-left corner with a semi-transparent background.
 */
function drawMetricsOverlay(
  ctx: CanvasRenderingContext2D,
  result: DetectionResult,
  fps: number
) {
  const face = result.faces[0];
  if (!face) return;

  const lines: string[] = [];

  if (face.rotation) {
    const { yaw, pitch, roll } = face.rotation.angle;
    const yawDeg = Math.round((yaw * 180) / Math.PI);
    const pitchDeg = Math.round((pitch * 180) / Math.PI);
    const rollDeg = Math.round((roll * 180) / Math.PI);
    lines.push(`Yaw: ${yawDeg}\u00B0  Pitch: ${pitchDeg}\u00B0  Roll: ${rollDeg}\u00B0`);

    const bearingDeg = Math.round((face.rotation.gaze.bearing * 180) / Math.PI);
    const strengthPct = Math.round(face.rotation.gaze.strength * 100);
    lines.push(`Gaze: ${bearingDeg}\u00B0 (${strengthPct}%)`);
  }

  lines.push(`Face: ${Math.round((face.score ?? 0) * 100)}%`);
  lines.push(`FPS: ${fps}`);

  // Background panel
  const lineHeight = 18;
  const padding = 8;
  const panelHeight = lines.length * lineHeight + padding * 2;
  const panelWidth = 280;

  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(6, 6, panelWidth, panelHeight);

  // Text
  ctx.fillStyle = "rgba(0, 255, 128, 0.9)";
  ctx.font = "13px monospace";

  lines.forEach((line, i) => {
    ctx.fillText(line, 6 + padding, 6 + padding + (i + 1) * lineHeight - 4);
  });
}
