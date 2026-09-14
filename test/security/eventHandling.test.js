import test from 'node:test';
import assert from 'node:assert/strict';

import { setSecurityEventHandled } from '../../lib/security/report.js';

function createClient(updatedRow, { error = null } = {}) {
  const calls = { updates: [], eqs: [], selects: [] };
  return {
    calls,
    from(table) {
      assert.equal(table, 'security_events');
      return {
        update(values) {
          calls.updates.push(values);
          const query = {
            eq(field, value) {
              calls.eqs.push({ field, value });
              return query;
            },
            select(fields) {
              calls.selects.push(fields);
              return query;
            },
            async maybeSingle() {
              return { data: updatedRow, error };
            },
          };
          return query;
        },
      };
    },
  };
}

test('보안 이벤트를 처리됨으로 표시하고 암호문 없이 결과만 돌려준다', async () => {
  const client = createClient({ id: 42, handled: true });

  const result = await setSecurityEventHandled({ eventId: '42', handled: true, client });

  assert.deepEqual(result, { ok: true, event: { id: 42, handled: true } });
  assert.deepEqual(client.calls.updates, [{ handled: true }]);
  assert.deepEqual(client.calls.eqs, [{ field: 'id', value: 42 }]);
  assert.equal(client.calls.selects[0].includes('ip_ciphertext'), false);
});

test('처리됨 이벤트를 미처리로 되돌릴 수 있다', async () => {
  const client = createClient({ id: 7, handled: false });

  const result = await setSecurityEventHandled({ eventId: 7, handled: false, client });

  assert.deepEqual(result, { ok: true, event: { id: 7, handled: false } });
  assert.deepEqual(client.calls.updates, [{ handled: false }]);
});

test('잘못된 이벤트 ID와 처리 상태는 DB 갱신 없이 거절한다', async () => {
  const client = createClient({ id: 1, handled: true });

  const invalidIds = ['abc', '0', '-3', '1.5', '../1'];
  for (const eventId of invalidIds) {
    const result = await setSecurityEventHandled({ eventId, handled: true, client });
    assert.equal(result.status, 400, eventId);
  }

  const invalidHandled = await setSecurityEventHandled({ eventId: 1, handled: 'true', client });
  assert.equal(invalidHandled.status, 400);
  assert.equal(client.calls.updates.length, 0);
});

test('없는 이벤트는 404, DB 오류는 예외로 올린다', async () => {
  const missing = await setSecurityEventHandled({
    eventId: 999,
    handled: true,
    client: createClient(null),
  });
  assert.equal(missing.status, 404);

  await assert.rejects(
    () =>
      setSecurityEventHandled({
        eventId: 1,
        handled: true,
        client: createClient(null, { error: new Error('update failed') }),
      }),
    /update failed/,
  );
});
