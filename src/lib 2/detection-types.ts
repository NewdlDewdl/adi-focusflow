/** State of webcam permission flow */
export type PermissionState =
  | 'idle'
  | 'checking'
  | 'prompt'
  | 'granted'
  | 'denied'
  | 'error';

/** Face detection data extracted from Human.js result */
export interface FaceDetectionData {
  id: number;
  score: number;
  boxScore: number;
  faceScore: number;
  box: [number, number, number, number];

  rotation: {
    angle: {
      roll: number;
      yaw: number;
      pitch: number;
    };
    matrix: number[];
    gaze: {
      bearing: number;
      strength: number;
    };
  } | null;

  mesh: [number, number, number?][];
  annotations: Record<string, [number, number, number?][]>;

  distance?: number;
}

/** Aggregated detection result for a single frame */
export interface DetectionResult {
  faces: FaceDetectionData[];
  performance: Record<string, number>;
  timestamp: number;
}

/** Runtime performance and memory metrics */
export interface PerformanceMetrics {
  fps: number;
  tensorCount: number;
  numBytes: number;
  isLeaking: boolean;
}
