"use client";

import { useRef } from "react";
import { useWebcamPermission } from "@/hooks/useWebcamPermission";
import { useHumanDetection } from "@/hooks/useHumanDetection";
import { useTensorMonitor } from "@/hooks/useTensorMonitor";
import PermissionGate from "@/components/detection/PermissionGate";
import PrivacyIndicator from "@/components/detection/PrivacyIndicator";
import WebcamView from "@/components/detection/WebcamView";
import MonitoringPanel from "@/components/detection/MonitoringPanel";

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

  // Track when detection becomes ready for uptime calculation
  const detectionStartRef = useRef<number | null>(null);
  if (isReady && detectionStartRef.current === null) {
    detectionStartRef.current = Date.now();
  }

  const faceDetected = result !== null && result.faces.length > 0;

  return (
    <PermissionGate
      state={state}
      error={error}
      requestPermission={requestPermission}
    >
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <PrivacyIndicator />

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
