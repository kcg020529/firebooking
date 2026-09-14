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

test('저장된 보안 로그 조회 응답은 다시 검사하지 않아 탐지 이벤트가 스스로 늘어나지 않는다', () => {
  // 마스킹 규칙이 오탐한 증거가 저장돼 있어도 대시보드 자동 갱신마다 새 이벤트를 만들지 않는다.
  const storedEvidence = JSON.stringify({
    ok: true,
    events: [{ id: 219, ruleId: 'PII_NAME', evidence: '아래 정보로 예약을 진행할까요? 연락처 010-1234-5678' }],
  });

  assert.deepEqual(inspectApiResponsePii('/api/admin/events', storedEvidence), []);
  assert.deepEqual(inspectApiResponsePii('/api/admin/audit', storedEvidence), []);
});

test('보안 로그 조회가 아닌 관리자 응답은 계속 개인정보를 검사한다', () => {
  const hits = inspectApiResponsePii(
    '/api/admin/events/219',
    JSON.stringify({ ok: true, note: '연락처 010-1234-5678' }),
  );

  assert.deepEqual(hits.map(({ ruleId }) => ruleId), ['PII_PHONE']);
});

