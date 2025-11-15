import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';
const EMAIL = __ENV.USER_EMAIL || __ENV.LOGIN_EMAIL || 'test@example.com';
const PASSWORD = __ENV.USER_PASSWORD || __ENV.LOGIN_PASSWORD || 'secret-password';

export const options = {
  stages: [
    // { duration: '3s', target: 20 },  // warm-up
    { duration: '3s', target: 5000 },  
    // { duration: '3s', target: 0 },   // ramp down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],  // < 1% error rate
    http_req_duration: ['p(95)<500'], // 95% requests < 500ms
  },
};

export default function () {
  const payload = JSON.stringify({ email: EMAIL, password: PASSWORD });
  const headers = { 'Content-Type': 'application/json' };

  const res = http.post(`${BASE_URL}/api/auth/signin`, payload, { headers });
  check(res, {
    'status is 200': (r) => r.status === 200,
    'got token cookie': (r) => !!r.cookies?.token,
  });

  sleep(1);
}
