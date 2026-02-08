"use client";

import { useWebcamPermission } from "@/hooks/useWebcamPermission";
import PermissionGate from "@/components/detection/PermissionGate";
import PrivacyIndicator from "@/components/detection/PrivacyIndicator";

export default function DetectionProvider() {
  const { state, error, videoRef, requestPermission } = useWebcamPermission();

  return (
    <PermissionGate
      state={state}
      error={error}
      requestPermission={requestPermission}
    >
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
        <PrivacyIndicator />

        <div className="relative overflow-hidden rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-auto w-full max-w-xl -scale-x-100"
          />
        </div>

        <div className="text-center">
          <h2 className="mb-1 text-lg font-semibold text-white">
            Camera connected
          </h2>
          <p className="text-sm text-gray-400">
            Detection pipeline will be enabled in the next plan.
          </p>
        </div>
      </div>
    </PermissionGate>
  );
}
