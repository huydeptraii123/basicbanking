import { NextFunction, Request, Response } from 'express';

type QueueEntry = {
  req: Request;
  res: Response;
  next: NextFunction;
  timeout: NodeJS.Timeout;
  aborted: boolean;
};

type Bucket = {
  active: number;
  queue: QueueEntry[];
};

const buckets = new Map<string, Bucket>();

const toInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const toBool = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) return fallback;
  return ['1', 'true', 'on', 'yes'].includes(value.toLowerCase());
};

const getKey = (req: Request) => {
  const forwarded = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
  return forwarded || req.ip || req.socket.remoteAddress || 'global';
};

const getConfig = () => ({
  enabled: toBool(process.env.SIGNIN_THROTTLE_ENABLED, false),
  maxConcurrent: toInt(process.env.SIGNIN_THROTTLE_MAX_CONCURRENT, 400),
  maxQueue: toInt(process.env.SIGNIN_THROTTLE_QUEUE_MAX, 800),
  maxWaitMs: toInt(process.env.SIGNIN_THROTTLE_MAX_WAIT_MS, 50000),
});

const getBucket = (key: string): Bucket => {
  const existing = buckets.get(key);
  if (existing) return existing;
  const created: Bucket = { active: 0, queue: [] };
  buckets.set(key, created);
  return created;
};

const drainQueue = (bucket: Bucket) => {
  const config = getConfig();
  const concurrencyLimit = config.enabled ? config.maxConcurrent : Number.MAX_SAFE_INTEGER;

  while (bucket.queue.length && bucket.active < concurrencyLimit) {
    const entry = bucket.queue.shift();
    if (!entry) break;
    if (entry.aborted) continue;
    clearTimeout(entry.timeout);
    bucket.active += 1;

    const cleanup = () => {
      entry.res.off('finish', cleanup);
      entry.res.off('close', cleanup);
      bucket.active = Math.max(bucket.active - 1, 0);
      drainQueue(bucket);
    };

    entry.res.once('finish', cleanup);
    entry.res.once('close', cleanup);
    entry.next();
  }
};

export const signinThrottle = (req: Request, res: Response, next: NextFunction) => {
  const config = getConfig();
  if (!config.enabled) return next();

  const key = getKey(req);
  const bucket = getBucket(key);

  if (bucket.queue.length) {
    // ensure queued requests are handled first before admitting new ones.
    drainQueue(bucket);
  }

  if (bucket.active < config.maxConcurrent) {
    bucket.active += 1;

    const cleanup = () => {
      res.off('finish', cleanup);
      res.off('close', cleanup);
      bucket.active = Math.max(bucket.active - 1, 0);
      drainQueue(bucket);
    };

    res.once('finish', cleanup);
    res.once('close', cleanup);
    return next();
  }

  if (bucket.queue.length >= config.maxQueue) {
    return res.status(429).json({ error: 'Sign-in queue is full, please try again shortly.' });
  }

  const entry: QueueEntry = {
    req,
    res,
    next,
    aborted: false,
    timeout: setTimeout(() => {
      entry.aborted = true;
      const idx = bucket.queue.indexOf(entry);
      if (idx >= 0) bucket.queue.splice(idx, 1);
      res.status(429).json({ error: 'Sign-in request timed out while waiting in queue.' });
    }, config.maxWaitMs),
  };

  bucket.queue.push(entry);
};