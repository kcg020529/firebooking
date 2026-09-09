import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPiiSecurityEvents,
  inspectResponseBody,
} from '../../lib/security/responseScan.js';

test('전체 API 응답 검사에서 개인정보 규칙을 탐지한다', () => {
  const findings = inspectResponseBody(
    JSON.stringify({ phone: '010-1234-5678', email: 'user@example.com' }),
  );

  assert.deepEqual(
    findings.piiHits.map(({ ruleId }) => ruleId),
    ['PII_PHONE', 'PII_EMAIL'],
  );
  assert.deepEqual(findings.secretHits, []);
});

test('API 응답의 비밀키 탐지는 기존 규칙으로 계속 동작한다', () => {
  const findings = inspectResponseBody('{"token":"sk-test-secret-value-123456"}');

  assert.deepEqual(findings.secretHits, ['PROVIDER_API_KEY']);
});

test('PII 이벤트 증거에는 응답 원문이나 원문 개인정보를 저장하지 않는다', () => {
  const events = buildPiiSecurityEvents({
    method: 'GET',
    path: '/api/bookings',
    hits: [{ ruleId: 'PII_PHONE', severity: 'info', count: 1 }],
    actorId: 'actor-1',
    ipHash: 'hash-1',
  });

  assert.equal(events.length, 1);
  assert.equal(events[0].rule_id, 'PII_PHONE');
  assert.equal(events[0].category, 'pii');
  assert.equal(events[0].evidence.includes('010-1234-5678'), false);
  assert.equal(events[0].evidence.includes('/api/bookings'), true);
});
