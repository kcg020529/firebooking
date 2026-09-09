import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createLoginLimitKey,
  finishLoginAttempt,
  isCredentialFailure,
  LOGIN_MAX_ATTEMPTS,
  reserveLoginAttempt,
} from '../../lib/security/loginProtection.js';

function withSecuritySecret(run) {
  const original = process.env.IP_HASH_SALT;
  process.env.IP_HASH_SALT = 'test-secret-with-at-least-32-characters';
  try {
    return run();
  } finally {
    if (original === undefined) delete process.env.IP_HASH_SALT;
    else process.env.IP_HASH_SALT = original;
  }
}

test('로그인 제한 키는 이메일을 정규화하고 IP별로 분리한다', () => {
  withSecuritySecret(() => {
    const first = createLoginLimitKey(' User@Example.com ', 'ip-a');
    const normalized = createLoginLimitKey('user@example.com', 'ip-a');
    const anotherIp = createLoginLimitKey('user@example.com', 'ip-b');

    assert.match(first, /^[0-9a-f]{64}$/);
    assert.equal(first, normalized);
    assert.notEqual(first, anotherIp);
    assert.equal(first.includes('user@example.com'), false);
  });
});

test('로그인 시도 예약과 확정은 고정된 보안 임계값으로 RPC를 호출한다', async () => {
  const calls = [];
  const client = {
    async rpc(name, params) {
      calls.push({ name, params });
      return name === 'reserve_login_attempt'
        ? { data: { allowed: true, remainingAttempts: 4 }, error: null }
        : { data: { locked: true, remainingAttempts: 0 }, error: null };
    },
  };

  const reservation = await reserveLoginAttempt('a'.repeat(64), client);
  const result = await finishLoginAttempt('a'.repeat(64), 'failure', client);

  assert.equal(reservation.allowed, true);
  assert.equal(result.locked, true);
  assert.equal(calls[0].params.p_max_attempts, LOGIN_MAX_ATTEMPTS);
  assert.equal(calls[1].params.p_outcome, 'failure');
});

test('잘못된 비밀번호만 실패 횟수로 세고 공급자 장애는 제외한다', () => {
  assert.equal(isCredentialFailure({ code: 'invalid_credentials', status: 400 }), true);
  assert.equal(isCredentialFailure({ code: 'over_request_rate_limit', status: 429 }), false);
  assert.equal(isCredentialFailure({ code: 'unexpected_failure', status: 500 }), false);
});
