import test from 'node:test';
import assert from 'node:assert/strict';

import * as securityReport from '../../lib/security/report.js';
import { encryptIncidentIp } from '../../lib/security/hash.js';

function createClient(eventRow) {
  const inserts = [];
  return {
    inserts,
    from(table) {
      if (table === 'security_events') {
        return {
          select() {
            const query = {
              eq() { return query; },
              async maybeSingle() {
                return { data: eventRow, error: null };
              },
            };
            return query;
          },
        };
      }

      return {
        async insert(row) {
          inserts.push({ table, row });
          return { error: null };
        },
      };
    },
  };
}

test('관리자는 유효한 critical 사고 IP를 복호화하고 사유를 감사 기록에 남긴다', async () => {
  assert.equal(typeof securityReport.revealSecurityEventIp, 'function');

  const previousKey = process.env.SECURITY_IP_ENCRYPTION_KEY;
  process.env.SECURITY_IP_ENCRYPTION_KEY = Buffer.alloc(32, 37).toString('base64');
  const client = createClient({
    id: 42,
    severity: 'critical',
    ip_ciphertext: encryptIncidentIp('203.0.113.91'),
    ip_expires_at: '2026-10-14T00:00:00.000Z',
  });

  try {
    const result = await securityReport.revealSecurityEventIp({
      eventId: 42,
      reason: '반복 로그인 공격자 차단 조사',
      user: { id: 'admin-id', role: 'admin' },
      adminIpHash: 'admin-ip-hash',
      client,
      now: new Date('2026-09-14T00:00:00.000Z'),
    });

    assert.deepEqual(result, {
      ok: true,
      ip: '203.0.113.91',
      expiresAt: '2026-10-14T00:00:00.000Z',
    });
    assert.deepEqual(client.inserts[0], {
      table: 'audit_logs',
      row: {
        actor_id: 'admin-id',
        actor_role: 'admin',
        action: 'security.ip.reveal',
        target_type: 'security_event',
        target_id: '42',
        result: 'allow',
        ip_hash: 'admin-ip-hash',
        reason: '반복 로그인 공격자 차단 조사',
      },
    });
  } finally {
    if (previousKey === undefined) delete process.env.SECURITY_IP_ENCRYPTION_KEY;
    else process.env.SECURITY_IP_ENCRYPTION_KEY = previousKey;
  }
});

test('staff는 암호화된 사고 IP를 복호화할 수 없다', async () => {
  assert.equal(typeof securityReport.revealSecurityEventIp, 'function');
  const client = createClient(null);

  const result = await securityReport.revealSecurityEventIp({
    eventId: 42,
    reason: '확인이 필요한 사고 조사',
    user: { id: 'staff-id', role: 'staff' },
    adminIpHash: 'staff-ip-hash',
    client,
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 403);
  assert.equal(client.inserts[0].row.result, 'deny');
});

test('보관 기간이 만료된 사고 IP는 복호화하지 않는다', async () => {
  assert.equal(typeof securityReport.revealSecurityEventIp, 'function');

  const previousKey = process.env.SECURITY_IP_ENCRYPTION_KEY;
  process.env.SECURITY_IP_ENCRYPTION_KEY = Buffer.alloc(32, 41).toString('base64');
  const client = createClient({
    id: 42,
    severity: 'critical',
    ip_ciphertext: encryptIncidentIp('198.51.100.88'),
    ip_expires_at: '2026-09-13T23:59:59.000Z',
  });

  try {
    const result = await securityReport.revealSecurityEventIp({
      eventId: 42,
      reason: '만료된 사고 조사 시도',
      user: { id: 'admin-id', role: 'admin' },
      adminIpHash: 'admin-ip-hash',
      client,
      now: new Date('2026-09-14T00:00:00.000Z'),
    });

    assert.equal(result.ok, false);
    assert.equal(result.status, 410);
  } finally {
    if (previousKey === undefined) delete process.env.SECURITY_IP_ENCRYPTION_KEY;
    else process.env.SECURITY_IP_ENCRYPTION_KEY = previousKey;
  }
});
