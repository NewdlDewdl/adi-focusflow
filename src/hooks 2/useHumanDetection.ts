"use client";

import { useRef, useEffect, useState } from "react";
import Human from "@vladmandic/human";
import { humanConfig } from "@/lib/human-config";
import type { DetectionResult, FaceDetectionData } from "@/lib/detection-types";

const DETECT_INTERVAL_MS = 200; // 5 Hz detection rate (PERF-04)

interface LoadingState {
  isLoading: boolean;
  loadingMessage: string;
  isReady: boolean;
}

interface UseHumanDetectionReturn {
  result: DetectionResult | null;
  fps: number;
  tensorCount: number;
  isLoading: boolean;
  loadingMessage: string;
  isReady: boolean;
  humanRef: React.RefObject<Human | null>;
}

/**
 * Manages the full Human.js lifecycle: model loading, warmup, throttled
 * detection at 5 Hz, temporal smoothing via human.next(), and cleanup.
 */
export function useHumanDetection(
  videoRef: React.RefObject<HTMLVideoElement | null>
): UseHumanDetectionReturn {
  const humanRef = useRef<Human | null>(null);
  const runningRef = useRef(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [fps, setFps] = useState(0);
  const [tensorCount, setTensorCount] = useState(0);
  const [loading, setLoading] = useState<LoadingState>({
    isLoading: true,
    loadingMessage: "Initializing...",
    isReady: false,
  });

  // Initialize Human.js once: load models, warmup GPU pipeline
  useEffect(() => {
    let cancelled = false;
    const human = new Human(humanConfig);
    humanRef.current = human;

    const init = async () => {
      try {
        setLoading({
          isLoading: true,
          loadingMessage: "Loading detection models...",
          isReady: false,
        });

        await human.load();

        if (cancelled) return;

        setLoading({
          isLoading: true,
          loadingMessage: "Warming up GPU...",
          isReady: false,
        });

        await human.warmup();

        if (cancelled) return;

        setLoading({
          isLoading: false,
          loadingMessage: "Ready",
          isReady: true,
        });
      } catch (err) {
        console.error("[useHumanDetection] Init failed:", err);
        if (!cancelled) {
          setLoading({
            isLoading: false,
            loadingMessage: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
            isReady: false,
          });
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      runningRef.current = false;
      humanRef.current = null;
    };
  }, []);

  // Detection loop: starts after init complete + video has active stream
  useEffect(() => {
    if (!loading.isReady) return;

    const video = videoRef.current;
    if (!video) return;

    const human = humanRef.current;
    if (!human) return;

    runningRef.current = true;
    let lastTime = performance.now();

    const detect = async () => {
      if (!runningRef.current) return;

      const vid = videoRef.current;
      if (!vid || vid.readyState < 2) {
        // Video not ready yet, retry shortly
        console.log('[useHumanDetection] Video not ready:', {
          hasVideo: !!vid,
          readyState: vid?.readyState,
          videoWidth: vid?.videoWidth,
          videoHeight: vid?.videoHeight,
        });
        if (runningRef.current) {
          setTimeout(detect, DETECT_INTERVAL_MS);
        }
        return;
      }

      try {
        const res = await human.detect(vid);
        console.log('[useHumanDetection] Raw detection result:', {
          faceCount: res.face?.length ?? 0,
          faces: res.face?.map(f => ({ score: f.score, boxScore: f.boxScore })),
          videoSize: { width: vid.videoWidth, height: vid.videoHeight },
        });
        const interpolated = human.next(res);

        // Map Human.js result to our DetectionResult type
        const faces: FaceDetectionData[] = (interpolated.face || []).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (face: any) => ({
            id: face.id ?? 0,
            score: face.score ?? 0,
            boxScore: face.boxScore ?? 0,
            faceScore: face.faceScore ?? 0,
            box: face.box ?? [0, 0, 0, 0],
            rotation: face.rotation
              ? {
                  angle: {
                    roll: face.rotation.angle?.roll ?? 0,
                    yaw: face.rotation.angle?.yaw ?? 0,
                    pitch: face.rotation.angle?.pitch ?? 0,
                  },
                  matrix: face.rotation.matrix ?? [],
                  gaze: {
                    bearing: face.rotation.gaze?.bearing ?? 0,
                    strength: face.rotation.gaze?.strength ?? 0,
                  },
                }
              : null,
            mesh: face.mesh ?? [],
            annotations: face.annotations ?? {},
            distance: face.distance,
          })
        );

        const detectionResult: DetectionResult = {
          faces,
          performance: interpolated.performance ?? {},
          timestamp: Date.now(),
        };

        setResult(detectionResult);

        // FPS calculation
        const now = performance.now();
        const elapsed = now - lastTime;
        if (elapsed > 0) {
          setFps(Math.round(1000 / elapsed));
        }
        lastTime = now;

        // Tensor monitoring
        try {
          setTensorCount(human.tf.memory().numTensors);
        } catch {
          // tf.memory() may not be available in all backends
        }
      } catch (err) {
        console.error("[useHumanDetection] Detection error:", err);
      }

      // Schedule next detection via recursive setTimeout (NOT setInterval)
      if (runningRef.current) {
        setTimeout(detect, DETECT_INTERVAL_MS);
      }
    };

    detect();

    return () => {
      runningRef.current = false;
    };
  }, [loading.isReady, videoRef]);

  return {
    result,
    fps,
    tensorCount,
    isLoading: loading.isLoading,
    loadingMessage: loading.loadingMessage,
    isReady: loading.isReady,
    humanRef,
  };
}
