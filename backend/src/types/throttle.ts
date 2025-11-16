export type ThrottleConfig = {
  enabled: boolean;
  maxConcurrent: number;
  queueMax: number;
  maxWaitMs: number;
};

export const DEFAULT_THROTTLE_CONFIG: ThrottleConfig = {
  enabled: true,
  maxConcurrent: 400,
  queueMax: 800,
  maxWaitMs: 50000,
};
