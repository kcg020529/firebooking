import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getRuleMetadata,
  SECURITY_RULE_METADATA,
} from '../../lib/security/securityConfig.js';

test('모든 규칙은 한글 이름·공격 분류·심각도 기준·대응 설명을 가진다', () => {
  for (const [ruleId, meta] of Object.entries(SECURITY_RULE_METADATA)) {
    assert.equal(meta.id, ruleId);
    assert.match(meta.name, /[가-힣]/);
    assert.ok(['attack', 'non_attack'].includes(meta.eventType));
    assert.ok(['critical', 'warn', 'info'].includes(meta.severity));
    assert.ok(meta.criteria.length >= 10);
    assert.ok(meta.response.length >= 5);
  }
});

test('주민번호와 카드번호 규칙은 제공하지 않는다', () => {
  assert.equal(getRuleMetadata('PII_RRN'), null);
  assert.equal(getRuleMetadata('PII_CARD'), null);
});

test('관리자 비인가 반복 접근은 상 등급 공격이다', () => {
  const meta = getRuleMetadata('ANO_ADMIN_BF');
  assert.equal(meta.eventType, 'attack');
  assert.equal(meta.severity, 'critical');
});

