import test from 'node:test';
import assert from 'node:assert/strict';

import { isValidSignupEmail, normalizeSignupEmail } from '../../lib/security/emailValidation.js';

test('회원가입 이메일은 @ 뒤 도메인과 점을 요구한다', () => {
  assert.equal(isValidSignupEmail('user@example.com'), true);
  assert.equal(isValidSignupEmail('USER+golf@sub.example.co.kr'), true);
  assert.equal(isValidSignupEmail('user@example'), false);
  assert.equal(isValidSignupEmail('user@localhost'), false);
  assert.equal(isValidSignupEmail('@example.com'), false);
  assert.equal(isValidSignupEmail('user @example.com'), false);
});

test('회원가입 이메일은 공백 제거와 소문자 정규화를 한 번만 수행한다', () => {
  assert.equal(normalizeSignupEmail(' User@Example.COM '), 'user@example.com');
});

