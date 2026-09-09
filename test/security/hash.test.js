import test from 'node:test';
import assert from 'node:assert/strict';

import { hashSecurityValue } from '../../lib/security/hash.js';

test('탐지용 지문은 원문 없이 동일 값을 비교할 수 있다', () => {
  const previousSalt = process.env.IP_HASH_SALT;
  process.env.IP_HASH_SALT = 'test-only-salt';

  try {
    const first = hashSecurityValue('01012345678');
    const second = hashSecurityValue('01012345678');
    const different = hashSecurityValue('01099999999');

    assert.equal(first, second);
    assert.notEqual(first, different);
    assert.equal(first.includes('01012345678'), false);
  } finally {
    if (previousSalt === undefined) delete process.env.IP_HASH_SALT;
    else process.env.IP_HASH_SALT = previousSalt;
  }
});
