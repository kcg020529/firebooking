import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createSessionTimeoutToken,
  isSessionTimeoutTokenValid,
  SESSION_IDLE_TIMEOUT_SECONDS,
} from '../../lib/security/sessionTimeout.js';

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

test('세션 타임아웃 토큰은 30분 안의 같은 사용자에게만 유효하다', () => {
  withSecuritySecret(() => {
    const issuedAt = Date.UTC(2026, 8, 9, 0, 0, 0);
    const token = createSessionTimeoutToken('user-1', issuedAt);

    assert.equal(isSessionTimeoutTokenValid(token, 'user-1', issuedAt), true);
    assert.equal(
      isSessionTimeoutTokenValid(
        token,
        'user-1',
        issuedAt + SESSION_IDLE_TIMEOUT_SECONDS * 1000 + 1000
      ),
      false
    );
    assert.equal(isSessionTimeoutTokenValid(token, 'user-2', issuedAt), false);
  });
});

test('서명을 바꾼 세션 타임아웃 토큰은 거부한다', () => {
  withSecuritySecret(() => {
    const issuedAt = Date.UTC(2026, 8, 9, 0, 0, 0);
    const token = createSessionTimeoutToken('user-1', issuedAt);
    const forged = `${token.slice(0, -1)}x`;

    assert.equal(isSessionTimeoutTokenValid(forged, 'user-1', issuedAt), false);
  });
});
