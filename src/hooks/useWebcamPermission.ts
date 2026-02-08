"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { PermissionState } from "@/lib/detection-types";

interface PermissionResult {
  state: PermissionState;
  error: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  requestPermission: () => Promise<void>;
}

export function useWebcamPermission(): PermissionResult {
  const [state, setState] = useState<PermissionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Check initial permission state without triggering browser prompt
  useEffect(() => {
    setState("checking");

    navigator.permissions
      .query({ name: "camera" as PermissionName })
      .then((status) => {
        if (status.state === "granted") {
          setState("granted");
        } else if (status.state === "denied") {
          setState("denied");
          setError(
            "Camera access was previously denied. Click the camera icon in your address bar to allow access."
          );
        } else {
          setState("prompt");
        }

        // Listen for changes (e.g., user changes in browser settings)
        status.addEventListener("change", () => {
          if (status.state === "granted") {
            setState("granted");
            setError(null);
          } else if (status.state === "denied") {
            setState("denied");
            setError(
              "Camera access was denied. Click the camera icon in your address bar to allow access."
            );
          }
        });
      })
      .catch(() => {
        // Permissions API not supported; fall through to getUserMedia
        setState("prompt");
      });
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setState("granted");
      setError(null);
    } catch (err: unknown) {
      setState("error");
      if (err instanceof DOMException) {
        switch (err.name) {
          case "NotAllowedError":
            setError(
              'Camera access denied. Click the camera icon in your address bar, then select "Allow".'
            );
            break;
          case "NotFoundError":
            setError(
              "No camera found. Please connect a webcam and try again."
            );
            break;
          case "NotReadableError":
            setError(
              "Camera is in use by another application. Close other apps using the camera and try again."
            );
            break;
          case "OverconstrainedError":
            setError(
              "Camera does not support the required settings. Try a different camera."
            );
            break;
          default:
            setError(`Camera error: ${err.message}`);
        }
      } else {
        setError(
          `Camera error: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }
  }, []);

  // Cleanup: stop all tracks on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  return { state, error, videoRef, requestPermission };
}
