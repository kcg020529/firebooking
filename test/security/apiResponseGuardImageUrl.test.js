import test from 'node:test';
import assert from 'node:assert/strict';

import { inspectApiResponsePii } from '../../lib/security/apiResponseGuard.js';

test('골프장 이미지 URL의 숫자 ID를 주민등록번호로 오탐하지 않는다', () => {
  const hits = inspectApiResponsePii(
    '/api/courses',
    JSON.stringify({
      name: '공개 골프장',
      phone: '031-555-0101',
      imageUrl: 'https://images.unsplash.com/photo-1500932334442-8761ee4810a7?w=800&q=80',
      description: '일반 골프장 설명',
    }),
  );

  assert.deepEqual(hits, []);
});

test('이미지 URL은 제외하되 다른 응답 개인정보는 계속 탐지한다', () => {
  const hits = inspectApiResponsePii(
    '/api/courses',
    JSON.stringify({
      imageUrl: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=80',
      description: '예약자 연락처 +82 10 9876 5432',
    }),
  );

  assert.deepEqual(hits.map(({ ruleId }) => ruleId), ['PII_PHONE']);
});

