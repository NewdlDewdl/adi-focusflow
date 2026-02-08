"use client";

import { useRef, useEffect, useState } from "react";
import type Human from "@vladmandic/human";
import type { PerformanceMetrics } from "@/lib/detection-types";

const DEFAULT_INTERVAL_MS = 5000;
const WINDOW_SIZE = 10;
const LEAK_THRESHOLD = 5; // 5 consecutive increasing readings

interface UseTensorMonitorReturn {
  numTensors: number;
  numBytes: number;
  isLeaking: boolean;
}

/**
 * Monitors TensorFlow.js tensor memory via human.tf.memory().
 * Checks every intervalMs (default 5s), maintains a sliding window
 * of the last 10 tensor count readings, and flags a leak if the
 * last 5 consecutive readings are strictly increasing.
 */
export function useTensorMonitor(
  humanRef: React.RefObject<Human | null>,
  intervalMs: number = DEFAULT_INTERVAL_MS
): UseTensorMonitorReturn {
  const [numTensors, setNumTensors] = useState(0);
  const [numBytes, setNumBytes] = useState(0);
  const [isLeaking, setIsLeaking] = useState(false);
  const windowRef = useRef<number[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      const human = humanRef.current;
      if (!human) return;

      try {
        const mem = human.tf.memory();
        const tensors = mem.numTensors ?? 0;
        const bytes = mem.numBytes ?? 0;

        setNumTensors(tensors);
        setNumBytes(bytes);

        // Update sliding window
        const window = windowRef.current;
        window.push(tensors);
        if (window.length > WINDOW_SIZE) {
          window.shift();
        }

        // Leak detection: last LEAK_THRESHOLD readings strictly increasing
        if (window.length >= LEAK_THRESHOLD) {
          const recent = window.slice(-LEAK_THRESHOLD);
          let increasing = true;
          for (let i = 1; i < recent.length; i++) {
            if (recent[i] <= recent[i - 1]) {
              increasing = false;
              break;
            }
          }

          if (increasing) {
            setIsLeaking(true);
            console.warn(
              `[TensorMonitor] Possible memory leak detected! Tensor count: ${tensors}, trend: ${recent.join(" -> ")}`
            );
          } else {
            setIsLeaking(false);
          }
        }
      } catch {
        // tf.memory() may not be available in all backends
      }
    }, intervalMs);

    return () => {
      clearInterval(timer);
    };
  }, [humanRef, intervalMs]);

  return { numTensors, numBytes, isLeaking };
}
