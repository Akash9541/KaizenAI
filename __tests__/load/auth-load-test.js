/**
 * K6 Load Testing Script for Authentication APIs
 * Tests performance under concurrent load
 * 
 * Run: k6 run __tests__/load/auth-load-test.js
 */

import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 10, // 10 virtual users
  duration: "30s", // 30 second test duration
  thresholds: {
    http_req_duration: ["p(95)<500", "p(99)<1000"], // 95% of requests under 500ms
    http_req_failed: ["rate<0.1"], // Error rate below 10%
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

/**
 * Test sign-up endpoint under load
 */
export function testSignUpLoad() {
  const email = `user-${Date.now()}-${Math.random()}@example.com`;
  const payload = JSON.stringify({
    name: "Load Test User",
    email: email,
    password: "SecurePassword123!",
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  const response = http.post(`${BASE_URL}/api/auth/sign-up`, payload, params);

  check(response, {
    "sign-up status is 201 or 400 or 429": (r) =>
      r.status === 201 || r.status === 400 || r.status === 429,
    "sign-up response time < 500ms": (r) => r.timings.duration < 500,
  });

  sleep(1);
}

/**
 * Test sign-in endpoint under load
 */
export function testSignInLoad() {
  const payload = JSON.stringify({
    email: "test@example.com",
    password: "SecurePassword123!",
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  const response = http.post(`${BASE_URL}/api/auth/sign-in`, payload, params);

  check(response, {
    "sign-in status is 200 or 401 or 429": (r) =>
      r.status === 200 || r.status === 401 || r.status === 429,
    "sign-in response time < 500ms": (r) => r.timings.duration < 500,
  });

  sleep(1);
}

/**
 * Test password reset endpoint under load
 */
export function testResetPasswordLoad() {
  const payload = JSON.stringify({
    email: "test@example.com",
    code: "123456",
    password: "NewPassword123!",
    confirmPassword: "NewPassword123!",
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  const response = http.post(
    `${BASE_URL}/api/auth/reset-password`,
    payload,
    params
  );

  check(response, {
    "reset status is 200 or 400 or 429": (r) =>
      r.status === 200 || r.status === 400 || r.status === 429,
    "reset response time < 500ms": (r) => r.timings.duration < 500,
  });

  sleep(1);
}

/**
 * Test rate limiting effectiveness
 */
export function testRateLimiting() {
  const scenarios = [
    testSignUpLoad,
    testSignInLoad,
    testResetPasswordLoad,
  ];

  const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  randomScenario();
}

/**
 * Default export - runs rate limiting test
 */
export default function test() {
  testRateLimiting();
}
