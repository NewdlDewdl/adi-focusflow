"use client";

import { useState, useEffect } from "react";

interface MonitoringPanelProps {
  fps: number;
  numTensors: number;
  numBytes: number;
  isLeaking: boolean;
  detectionStartTime: number | null;
}

/**
 * Collapsible monitoring panel showing real-time detection performance:
 * FPS (color-coded), tensor count, memory usage, leak status, and uptime.
 * Auto-expands when a memory leak is detected.
 */
export default function MonitoringPanel({
  fps,
  numTensors,
  numBytes,
  isLeaking,
  detectionStartTime,
}: MonitoringPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [uptime, setUptime] = useState("00:00");

  // Auto-expand when leak detected
  useEffect(() => {
    if (isLeaking) {
      setIsOpen(true);
    }
  }, [isLeaking]);

  // Uptime timer
  useEffect(() => {
    if (!detectionStartTime) return;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - detectionStartTime) / 1000);
      const mins = Math.floor(elapsed / 60)
        .toString()
        .padStart(2, "0");
      const secs = (elapsed % 60).toString().padStart(2, "0");
      setUptime(`${mins}:${secs}`);
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [detectionStartTime]);

  const memoryMB = (numBytes / (1024 * 1024)).toFixed(1);

  const fpsColor =
    fps >= 15
      ? "text-green-400"
      : fps >= 10
        ? "text-yellow-400"
        : "text-red-400";

  const statusColor = isLeaking ? "text-red-400" : "text-green-400";
  const statusText = isLeaking ? "LEAK DETECTED" : "Stable";

  return (
    <div className="fixed bottom-4 right-4 z-50 font-mono text-xs">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="mb-1 ml-auto block rounded bg-warmSurface/80 px-2 py-1 text-warmBrownMuted backdrop-blur-sm transition-colors hover:text-warmBrown"
        aria-label={isOpen ? "Collapse monitoring panel" : "Expand monitoring panel"}
      >
        {isOpen ? "[-] Monitor" : "[+] Monitor"}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="rounded-lg border border-warmBorder bg-warmBeige/90 p-3 shadow-lg backdrop-blur-sm">
          <div className="space-y-1.5">
            {/* FPS */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-warmBrownMuted">FPS</span>
              <span className={fpsColor}>{fps}</span>
            </div>

            {/* Tensors */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-warmBrownMuted">Tensors</span>
              <span className="text-warmBrown">{numTensors}</span>
            </div>

            {/* Memory */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-warmBrownMuted">Memory</span>
              <span className="text-warmBrown">{memoryMB} MB</span>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-warmBrownMuted">Status</span>
              <span className={`${statusColor} ${isLeaking ? "animate-pulse" : ""}`}>
                {statusText}
              </span>
            </div>

            {/* Uptime */}
            <div className="flex items-center justify-between gap-4">
              <span className="text-warmBrownMuted">Uptime</span>
              <span className="text-warmBrown">{uptime}</span>
            </div>
          </div>

          {/* Leak warning */}
          {isLeaking && (
            <div className="mt-2 rounded border border-red-800 bg-red-900/50 p-2 text-red-300">
              Tensor count is climbing. Consider enabling{" "}
              <code className="rounded bg-red-800/50 px-1">deallocate: true</code>{" "}
              in human-config.ts
            </div>
          )}
        </div>
      )}
    </div>
  );
}
