import { Router } from 'express';
import { runLoadTest, readStoredResults, LoadConfig, RunnerMode, TargetOverrides } from '../utils/loadTestRunner';
import { ThrottleConfig } from '../types/throttle';

const router = Router();

const parseNumber = (value: any, fallback: number) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : fallback;
};

const sanitizeThrottle = (body: any): ThrottleConfig => ({
  enabled: Boolean(body?.enabled),
  maxConcurrent: parseNumber(body?.maxConcurrent, 500),
  queueMax: parseNumber(body?.queueMax, 500),
  maxWaitMs: parseNumber(body?.maxWaitMs, 5000),
});

const sanitizeLoad = (body: any): LoadConfig => ({
  requestCount: parseNumber(body?.requestCount, 1000),
  durationSeconds: parseNumber(body?.durationSeconds, 30),
});

const sanitizeTarget = (body: any): TargetOverrides | undefined => {
  if (!body) return undefined;
  const target: TargetOverrides = {};
  if (typeof body.baseUrl === 'string' && body.baseUrl.trim()) {
    target.baseUrl = body.baseUrl.trim();
  }
  if (typeof body.userEmail === 'string' && body.userEmail.trim()) {
    target.userEmail = body.userEmail.trim();
  }
  if (typeof body.userPassword === 'string' && body.userPassword.trim()) {
    target.userPassword = body.userPassword.trim();
  }
  return Object.keys(target).length ? target : undefined;
};

router.get('/load-test/latest', async (_req, res) => {
  try {
    const stored = await readStoredResults();
    if (!stored) {
      return res.status(404).json({ message: 'No results recorded yet' });
    }
    return res.json(stored);
  } catch (error: any) {
    return res.status(500).json({ message: error.message || 'Failed to read results' });
  }
});

const sanitizeMode = (value: any): RunnerMode => {
  return value === 'docker' ? 'docker' : 'local';
};

router.post('/load-test', async (req, res) => {
  try {
    const throttle = sanitizeThrottle(req.body?.throttle);
    const load = sanitizeLoad(req.body?.load);
    const mode = sanitizeMode(req.body?.mode);
    const target = sanitizeTarget(req.body?.target);
    const results = await runLoadTest(throttle, load, mode, target);
    return res.json(results);
  } catch (error: any) {
    console.error('load-test error', error);
    return res.status(500).json({ message: error.message || 'Failed to run load test' });
  }
});

export default router;
