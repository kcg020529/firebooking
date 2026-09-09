import test from 'node:test';
import assert from 'node:assert/strict';

import { inspectApiResponsePii } from '../../lib/security/apiResponseGuard.js';

test('일반 API JSON 응답의 개인정보를 탐지한다', () => {
  const hits = inspectApiResponsePii(
    '/api/example',
    JSON.stringify({ name: '김철수', phone: '+82 10 1234 5678' }),
  );

  assert.deepEqual(
    hits.map(({ ruleId }) => ruleId),
    ['PII_PHONE', 'PII_NAME'],
  );
});

test('공개 골프장 이름과 대표전화는 개인정보 경보에서 제외한다', () => {
  const hits = inspectApiResponsePii(
    '/api/courses/field-1',
    JSON.stringify({ name: '한양CC', phone: '010-1234-5678' }),
  );

  assert.deepEqual(hits, []);
});

test('골프장 API에서도 공개 필드 밖의 개인정보는 탐지한다', () => {
  const hits = inspectApiResponsePii(
    '/api/courses/field-1',
    JSON.stringify({
      name: '한양CC',
      phone: '010-1234-5678',
      memo: '+82 10 9876 5432',
    }),
  );

  assert.deepEqual(hits.map(({ ruleId }) => ruleId), ['PII_PHONE']);
});
