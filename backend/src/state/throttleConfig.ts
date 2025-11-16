import { DEFAULT_THROTTLE_CONFIG, ThrottleConfig } from '../types/throttle';

const toInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const toBool = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) return fallback;
  return ['1', 'true', 'on', 'yes'].includes(value.toLowerCase());
};

const buildInitialConfig = (): ThrottleConfig => ({
  enabled: toBool(process.env.SIGNIN_THROTTLE_ENABLED, DEFAULT_THROTTLE_CONFIG.enabled),
  maxConcurrent: toInt(process.env.SIGNIN_THROTTLE_MAX_CONCURRENT, DEFAULT_THROTTLE_CONFIG.maxConcurrent),
  queueMax: toInt(process.env.SIGNIN_THROTTLE_QUEUE_MAX, DEFAULT_THROTTLE_CONFIG.queueMax),
  maxWaitMs: toInt(process.env.SIGNIN_THROTTLE_MAX_WAIT_MS, DEFAULT_THROTTLE_CONFIG.maxWaitMs),
});

let currentConfig: ThrottleConfig = buildInitialConfig();

export const getThrottleConfig = (): ThrottleConfig => currentConfig;

export const setThrottleConfig = (config: ThrottleConfig) => {
  currentConfig = { ...config };
  process.env.SIGNIN_THROTTLE_ENABLED = config.enabled ? 'true' : 'false';
  process.env.SIGNIN_THROTTLE_MAX_CONCURRENT = String(config.maxConcurrent);
  process.env.SIGNIN_THROTTLE_QUEUE_MAX = String(config.queueMax);
  process.env.SIGNIN_THROTTLE_MAX_WAIT_MS = String(config.maxWaitMs);
};
