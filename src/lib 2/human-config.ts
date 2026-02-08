import type { Config } from '@vladmandic/human';

export const humanConfig: Partial<Config> = {
  backend: 'humangl' as const,
  modelBasePath: 'https://cdn.jsdelivr.net/npm/@vladmandic/human/models/',
  cacheModels: true,
  cacheSensitivity: 0.70,
  deallocate: false,
  warmup: 'full',
  debug: false,

  filter: {
    enabled: true,
    equalization: false,
    autoBrightness: true,
    flip: false,
    return: true,
    width: 0,
    height: 0,
  },

  face: {
    enabled: true,
    detector: {
      modelPath: 'blazeface.json',
      rotation: true,
      maxDetected: 1,
      minConfidence: 0.2,
      skipFrames: 99,
      skipTime: 2500,
      iouThreshold: 0.1,
      scale: 1.4,
      mask: false,
      return: false,
    },
    mesh: {
      enabled: true,
      modelPath: 'facemesh.json',
      keepInvalid: false,
    },
    iris: {
      enabled: true,
      modelPath: 'iris.json',
      scale: 2.3,
    },
    emotion: { enabled: false },
    description: { enabled: false },
    attention: { enabled: false },
    antispoof: { enabled: false },
    liveness: { enabled: false },
  },

  body: { enabled: false },
  hand: { enabled: false },
  object: { enabled: false },
  segmentation: { enabled: false },

  gesture: { enabled: true },
};
