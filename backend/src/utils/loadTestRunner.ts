import { spawn } from 'child_process';
import path from 'path';
import { promises as fs } from 'fs';
import si from 'systeminformation';
import { ThrottleConfig } from '../types/throttle';
import { setThrottleConfig } from '../state/throttleConfig';

const BACKEND_ROOT = path.resolve(__dirname, '..', '..');
const TESTS_DIR = path.join(BACKEND_ROOT, 'tests', 'load');
const RESULTS_DIR = path.join(TESTS_DIR, 'results');
const SUMMARY_FILE = path.join(RESULTS_DIR, 'latest-summary.json');
const HISTORY_FILE = path.join(RESULTS_DIR, 'latest.json');

export type LoadConfig = {
  requestCount: number;
  durationSeconds: number;
};

export type TargetOverrides = {
  baseUrl?: string;
  userEmail?: string;
  userPassword?: string;
};

export type RunnerMode = 'local' | 'docker';

export type SystemSnapshot = {
  timestamp: string;
  cpuLoad: number;
  cpuUser: number;
  cpuSystem: number;
  memory: {
    total: number;
    available: number;
    used: number;
    usedPercent: number;
  };
  network: {
    rxBytes: number;
    txBytes: number;
  };
};

export type LoadTestResult = {
  timestamp: string;
  throttle: ThrottleConfig;
  load: LoadConfig;
  k6Summary: any;
  derivedMetrics: {
    throughputRps: number;
    errorRate: number;
    httpFailureRate: number;
    checkFailureRate: number;
    latencyP95?: number | null;
    latencyAvg?: number | null;
    networkMbps?: number | null;
  };
  systemBefore: SystemSnapshot;
  systemAfter: SystemSnapshot;
  stdout: string;
  stderr: string;
};

export type StoredResults = {
  current: LoadTestResult | null;
  previous: LoadTestResult | null;
};

const ensureResultsDir = async () => {
  await fs.mkdir(RESULTS_DIR, { recursive: true });
};

const captureSystemSnapshot = async (): Promise<SystemSnapshot> => {
  const [load, mem, networkStats] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.networkStats(),
  ]);

  const rxBytes = networkStats.reduce((sum, iface) => sum + (iface.rx_bytes || 0), 0);
  const txBytes = networkStats.reduce((sum, iface) => sum + (iface.tx_bytes || 0), 0);
  const used = mem.total - mem.available;
  const usedPercent = mem.total ? (used / mem.total) * 100 : 0;

  return {
    timestamp: new Date().toISOString(),
    cpuLoad: load.currentLoad,
    cpuUser: load.currentLoadUser,
    cpuSystem: load.currentLoadSystem,
    memory: {
      total: mem.total,
      available: mem.available,
      used,
      usedPercent,
    },
    network: {
      rxBytes,
      txBytes,
    },
  };
};

const parseK6Summary = async () => {
  const raw = await fs.readFile(SUMMARY_FILE, 'utf8');
  return JSON.parse(raw);
};

const computeDerivedMetrics = (
  summary: any,
  load: LoadConfig,
  systemBefore: SystemSnapshot,
  systemAfter: SystemSnapshot,
) => {
  const httpReqs = summary?.metrics?.http_reqs?.count || 0;
  const pickNumber = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);

  const computeFailureRate = (metric: any, assumeValueIsFailure = true): number => {
    if (!metric) return 0;
    const candidates = [metric, metric?.values].filter(Boolean);
    for (const candidate of candidates) {
      const passes = pickNumber(candidate?.passes);
      const fails = pickNumber(candidate?.fails);
      if (typeof fails === 'number' && (typeof passes === 'number' || fails > 0)) {
        const total = (passes ?? 0) + fails;
        if (total > 0) {
          return Math.min(1, Math.max(0, fails / total));
        }
      }
    }

    const rate = pickNumber(metric?.values?.rate ?? metric?.rate);
    if (rate !== undefined) {
      return assumeValueIsFailure ? Math.min(1, Math.max(0, rate)) : Math.min(1, Math.max(0, 1 - rate));
    }

    const value = pickNumber(metric?.values?.value ?? metric?.value);
    if (value !== undefined) {
      return assumeValueIsFailure ? Math.min(1, Math.max(0, value)) : Math.min(1, Math.max(0, 1 - value));
    }

    return 0;
  };

  const httpFailureRate = computeFailureRate(summary?.metrics?.http_req_failed, true);
  const checkFailureRate = computeFailureRate(summary?.metrics?.checks, false);
  const errorRate = Math.min(1, Math.max(httpFailureRate, checkFailureRate));
  const duration = Math.max(1, load.durationSeconds);
  const throughputRps = httpReqs / duration;
  const durationMetric = summary?.metrics?.http_req_duration || {};
  const latencyValues = durationMetric.values && Object.keys(durationMetric.values).length
    ? durationMetric.values
    : durationMetric;
  const latencyP95 = pickNumber(latencyValues['p(95)'])
    ?? pickNumber((latencyValues as any)['95th'])
    ?? pickNumber((latencyValues as any).p95)
    ?? null;
  const latencyAvg = pickNumber(latencyValues.avg)
    ?? pickNumber((latencyValues as any).mean)
    ?? null;

  const totalBefore = systemBefore.network.rxBytes + systemBefore.network.txBytes;
  const totalAfter = systemAfter.network.rxBytes + systemAfter.network.txBytes;
  const bytesDiff = Math.max(0, totalAfter - totalBefore);
  const networkMbps = (bytesDiff / duration) / (1024 * 1024);

  return {
    throughputRps,
    errorRate,
    httpFailureRate,
    checkFailureRate,
    latencyP95,
    latencyAvg,
    networkMbps,
  };
};

const applyThrottleConfig = (config: ThrottleConfig) => {
  setThrottleConfig(config);
};

const getK6Env = (load: LoadConfig, target?: TargetOverrides) => {
  const baseUrl = target?.baseUrl
    || process.env.LOAD_TEST_BASE_URL
    || process.env.BASE_URL
    || 'http://localhost:4000';
  const userEmail = target?.userEmail
    || process.env.LOAD_TEST_EMAIL
    || process.env.USER_EMAIL
    || process.env.LOGIN_EMAIL;
  const userPassword = target?.userPassword
    || process.env.LOAD_TEST_PASSWORD
    || process.env.USER_PASSWORD
    || process.env.LOGIN_PASSWORD;

  return {
    BASE_URL: baseUrl,
    USER_EMAIL: userEmail || '',
    USER_PASSWORD: userPassword || '',
    REQUEST_COUNT: String(load.requestCount),
    DURATION_SECONDS: String(load.durationSeconds),
    CONSTANT_ARRIVAL: '1',
  };
};

const runK6Local = (
  load: LoadConfig,
  target?: TargetOverrides,
): Promise<{ stdout: string; stderr: string; summary: any }> => {
  const scriptPath = path.join(TESTS_DIR, 'login-k6.js');
  return new Promise((resolve, reject) => {
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];
    const child = spawn(process.env.K6_PATH || 'k6', [
      'run',
      '--quiet',
      '--summary-export',
      SUMMARY_FILE,
      scriptPath,
    ], {
      cwd: BACKEND_ROOT,
      env: {
        ...process.env,
        ...getK6Env(load, target),
      },
    });
    child.stdout.on('data', (data) => stdoutChunks.push(data.toString()));
    child.stderr.on('data', (data) => stderrChunks.push(data.toString()));
    child.on('error', (err) => reject(err));
    child.on('close', async (code) => {
      const isThresholdFailure = code === 99;
      if (code !== 0 && !isThresholdFailure) {
        return reject(new Error(`k6 exited with code ${code}.\n${stderrChunks.join('')}`));
      }
      try {
        const summary = await parseK6Summary();
        if (isThresholdFailure) {
          stderrChunks.push('k6 exited with code 99 due to threshold failure, summarizing results.');
        }
        resolve({ stdout: stdoutChunks.join(''), stderr: stderrChunks.join(''), summary });
      } catch (error) {
        reject(error);
      }
    });
  });
};

const DOCKER_WORKDIR = '/work/backend';
const DOCKER_SCRIPT_PATH = path.posix.join(DOCKER_WORKDIR, 'tests', 'load', 'login-k6.js');
const DOCKER_SUMMARY_PATH = path.posix.join(DOCKER_WORKDIR, 'tests', 'load', 'results', 'latest-summary.json');

const runK6Docker = (
  load: LoadConfig,
  target?: TargetOverrides,
): Promise<{ stdout: string; stderr: string; summary: any }> => {
  const hostBackendPath = BACKEND_ROOT.replace(/\\/g, '/');
  return new Promise((resolve, reject) => {
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];
    const child = spawn('docker', [
      'run',
      '--rm',
      '-v', `${hostBackendPath}:${DOCKER_WORKDIR}`,
      '-w', DOCKER_WORKDIR,
      ...Object.entries(getK6Env(load, target)).flatMap(([key, value]) => ['--env', `${key}=${value}`]),
      'grafana/k6:latest',
      'run',
      '--quiet',
      '--summary-export',
      DOCKER_SUMMARY_PATH,
      DOCKER_SCRIPT_PATH,
    ]);
    child.stdout.on('data', (data) => stdoutChunks.push(data.toString()));
    child.stderr.on('data', (data) => stderrChunks.push(data.toString()));
    child.on('error', (err) => reject(err));
    child.on('close', async (code) => {
      const isThresholdFailure = code === 99;
      if (code !== 0 && !isThresholdFailure) {
        return reject(new Error(`k6 docker exited with code ${code}.\n${stderrChunks.join('')}`));
      }
      try {
        const summary = await parseK6Summary();
        if (isThresholdFailure) {
          stderrChunks.push('k6 exited with code 99 due to threshold failure, summarizing results.');
        }
        resolve({ stdout: stdoutChunks.join(''), stderr: stderrChunks.join(''), summary });
      } catch (error) {
        reject(error);
      }
    });
  });
};

export const readStoredResults = async (): Promise<StoredResults | null> => {
  try {
    await ensureResultsDir();
    const raw = await fs.readFile(HISTORY_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const runK6 = async (load: LoadConfig, mode: RunnerMode, target?: TargetOverrides) => {
  await ensureResultsDir();
  if (mode === 'docker') {
    return runK6Docker(load, target);
  }
  return runK6Local(load, target);
};

export const runLoadTest = async (
  throttle: ThrottleConfig,
  load: LoadConfig,
  mode: RunnerMode = 'local',
  target?: TargetOverrides,
) => {
  const previous = await readStoredResults();
  applyThrottleConfig(throttle);

  const systemBefore = await captureSystemSnapshot();
  const { stdout, stderr, summary } = await runK6(load, mode, target);
  const systemAfter = await captureSystemSnapshot();

  const derivedMetrics = computeDerivedMetrics(summary, load, systemBefore, systemAfter);

  const result: LoadTestResult = {
    timestamp: new Date().toISOString(),
    throttle,
    load,
    k6Summary: summary,
    derivedMetrics,
    systemBefore,
    systemAfter,
    stdout,
    stderr,
  };

  const stored: StoredResults = {
    previous: previous?.current || null,
    current: result,
  };

  await ensureResultsDir();
  await fs.writeFile(HISTORY_FILE, JSON.stringify(stored, null, 2), 'utf8');

  return stored;
};
