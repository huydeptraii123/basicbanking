import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const EMAIL = __ENV.USER_EMAIL || __ENV.LOGIN_EMAIL || 'test@example.com';
const PASSWORD = __ENV.USER_PASSWORD || __ENV.LOGIN_PASSWORD || 'secret-password';

const REQUEST_COUNT = Number(__ENV.REQUEST_COUNT) || 3000;
const DURATION_SECONDS = Number(__ENV.DURATION_SECONDS) || 3;
const USE_CONSTANT_ARRIVAL = (__ENV.CONSTANT_ARRIVAL || '1') !== '0';
const TARGET_RATE = Math.max(1, Math.round(REQUEST_COUNT / Math.max(1, DURATION_SECONDS)));
const PREALLOCATED_VUS = Number(__ENV.PREALLOCATED_VUS) || Math.max(10, TARGET_RATE);
const MAX_VUS = Number(__ENV.MAX_VUS) || Math.max(PREALLOCATED_VUS * 2, TARGET_RATE * 2);
const SLEEP_SECONDS = Number(__ENV.SLEEP_SECONDS ?? '0');

const thresholdConfig = {
  http_req_failed: ['rate<0.05'],
  http_req_duration: ['p(95)<1000'],
};

export const options = USE_CONSTANT_ARRIVAL
  ? {
      scenarios: {
        constant_request_rate: {
          executor: 'constant-arrival-rate',
          rate: TARGET_RATE,
          timeUnit: '1s',
          duration: `${DURATION_SECONDS}s`,
          preAllocatedVUs: PREALLOCATED_VUS,
          maxVUs: MAX_VUS,
        },
      },
      thresholds: thresholdConfig,
    }
  : {
      thresholds: thresholdConfig,
      vus: PREALLOCATED_VUS,
      duration: `${DURATION_SECONDS}s`,
    };

export default function () {
  const payload = JSON.stringify({ email: EMAIL, password: PASSWORD });
  const headers = { 'Content-Type': 'application/json' };

  const res = http.post(`${BASE_URL}/api/auth/signin`, payload, { headers });
  check(res, {
    'status is 200': (r) => r.status === 200,
    'got token cookie': (r) => !!r.cookies?.token,
  });

  if (SLEEP_SECONDS > 0) {
    sleep(SLEEP_SECONDS);
  }
}
