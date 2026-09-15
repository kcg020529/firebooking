import test from 'node:test';
import assert from 'node:assert/strict';

import { blockIp, checkIpBlock, unblockIp } from '../../lib/security/ipBlocklist.js';

function createRepository({ existing = null, stored = null } = {}) {
  const calls = [];
  return {
    calls,
    async findActiveByHash(ipHash) {
      calls.push(['findActiveByHash', ipHash]);
      return existing;
    },
    async createPending(values) {
      calls.push(['createPending', values]);
      return { id: 7, ...values, status: 'applying', isActive: true };
    },
    async markActive(id, ruleId) {
      calls.push(['markActive', id, ruleId]);
      return { id, status: 'active', cloudflareRuleId: ruleId, isActive: true };
    },
    async markSyncError(id) {
      calls.push(['markSyncError', id]);
      return { id, status: 'sync_error', cloudflareRuleId: null, isActive: true };
    },
    async getById(id) {
      calls.push(['getById', id]);
      return stored;
    },
    async release(id, actorId) {
      calls.push(['release', id, actorId]);
      return { id, status: 'released', isActive: false };
    },
    async incrementBlocked(id) {
      calls.push(['incrementBlocked', id]);
    },
  };
}

test('차단 등록은 원본 IP를 저장소에 넘기지 않고 Cloudflare에만 전달한다', async () => {
  const repository = createRepository();
  let firewallInput;
  const result = await blockIp({
    ip: '203.0.113.8',
    ipHash: 'hash-8',
    reason: '관리자 경로 반복 공격',
    sourceEventId: 42,
    actorId: 'admin-id',
    repository,
    createFirewallBlock: async (input) => {
      firewallInput = input;
      return { ruleId: 'cf-42' };
    },
  });

  assert.equal(result.status, 'active');
  assert.equal(firewallInput.ip, '203.0.113.8');
  const pending = repository.calls.find(([name]) => name === 'createPending')[1];
  assert.equal('ip' in pending, false);
  assert.equal(pending.ipHash, 'hash-8');
});

test('Cloudflare 실패 시 앱 차단은 유지하고 동기화 오류로 표시한다', async () => {
  const repository = createRepository();
  const result = await blockIp({
    ip: '203.0.113.8',
    ipHash: 'hash-8',
    reason: '반복 공격',
    repository,
    createFirewallBlock: async () => { throw new Error('network'); },
  });

  assert.equal(result.status, 'sync_error');
  assert.ok(repository.calls.some(([name]) => name === 'markSyncError'));
});

test('활성 블랙리스트 IP는 차단 횟수를 늘리고 로그인 거부 결정을 반환한다', async () => {
  const repository = createRepository({ existing: { id: 3, status: 'active', isActive: true } });
  const result = await checkIpBlock({ ipHash: 'hash-3', repository });
  assert.equal(result.blocked, true);
  assert.ok(repository.calls.some(([name]) => name === 'incrementBlocked'));
});

test('해제는 Cloudflare 규칙 삭제 성공 후에만 DB 차단을 비활성화한다', async () => {
  const repository = createRepository({
    stored: { id: 9, isActive: true, cloudflareRuleId: 'cf-9' },
  });
  const calls = [];
  const result = await unblockIp({
    blockId: 9,
    actorId: 'admin-id',
    repository,
    deleteFirewallBlock: async ({ ruleId }) => calls.push(ruleId),
  });

  assert.equal(result.isActive, false);
  assert.deepEqual(calls, ['cf-9']);
  assert.ok(repository.calls.some(([name]) => name === 'release'));
});

test('Cloudflare 해제 실패 시 DB 차단을 유지한다', async () => {
  const repository = createRepository({
    stored: { id: 9, isActive: true, cloudflareRuleId: 'cf-9' },
  });
  await assert.rejects(
    () => unblockIp({
      blockId: 9,
      actorId: 'admin-id',
      repository,
      deleteFirewallBlock: async () => { throw new Error('delete failed'); },
    }),
    /delete failed/,
  );
  assert.equal(repository.calls.some(([name]) => name === 'release'), false);
});

