import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CAPTCHA_TOKEN_MAX_LENGTH,
  isCaptchaFailure,
  normalizeCaptchaToken,
} from '../../lib/security/captcha.js';

test('CAPTCHA 토큰은 문자열만 받고 앞뒤 공백을 제거한다', () => {
  assert.equal(normalizeCaptchaToken('  token-value  '), 'token-value');
  assert.equal(normalizeCaptchaToken(''), null);
  assert.equal(normalizeCaptchaToken('   '), null);
  assert.equal(normalizeCaptchaToken(undefined), null);
  assert.equal(normalizeCaptchaToken(12345), null);
  assert.equal(normalizeCaptchaToken({ token: 'x' }), null);
});

test('상한을 넘는 CAPTCHA 토큰은 조작된 입력으로 보고 버린다', () => {
  assert.equal(normalizeCaptchaToken('a'.repeat(CAPTCHA_TOKEN_MAX_LENGTH)), 'a'.repeat(CAPTCHA_TOKEN_MAX_LENGTH));
  assert.equal(normalizeCaptchaToken('a'.repeat(CAPTCHA_TOKEN_MAX_LENGTH + 1)), null);
});

test('CAPTCHA 실패는 비밀번호 실패와 구분한다', () => {
  assert.equal(isCaptchaFailure({ code: 'captcha_failed', status: 400 }), true);
  assert.equal(isCaptchaFailure({ code: 'invalid_credentials', status: 400 }), false);
  assert.equal(isCaptchaFailure(null), false);
});
