import test from 'node:test';
import assert from 'node:assert/strict';

import {
  checkApiRateLimit,
  detectCodeEnumeration,
  detectLookupBruteForce,
  detectScalping,
} from '../../lib/security/rules.js';
import { ANOMALY_RULES } from '../../lib/security/securityConfig.js';

function createRateLimitClient({ apiCount, existingEventCount = 0 }) {
  const inserts = [];

  return {
    inserts,
    from(table) {
      return {
        select() {
          const result = table === 'api_logs'
            ? { count: apiCount, error: null }
            : { count: existingEventCount, error: null };
          const query = {
            eq() { return query; },
            gte() { return query; },
            then(resolve, reject) {
              return Promise.resolve(result).then(resolve, reject);
            },
          };
          return query;
        },
        async insert(row) {
          inserts.push({ table, row });
          return { error: null };
        },
      };
    },
  };
}

function createAnomalyClient({ auditCount = 0, auditTargets = [] } = {}) {
  const inserts = [];

  return {
    inserts,
    from(table) {
      return {
        select(_fields, options = {}) {
          let result;
          if (table === 'security_events') {
            result = { count: 0, error: null };
          } else if (options.head) {
            result = { count: auditCount, error: null };
          } else {
            result = {
              data: auditTargets.map((targetId) => ({ target_id: targetId })),
              error: null,
            };
          }

          const query = {
            eq() { return query; },
            gte() { return query; },
            limit() { return query; },
            then(resolve, reject) {
              return Promise.resolve(result).then(resolve, reject);
            },
          };
          return query;
        },
        async insert(row) {
          inserts.push({ table, row });
          return { error: null };
        },
      };
    },
  };
}

async function runScheduled(invoke) {
  let pending;
  invoke({ schedule: (operation) => { pending = operation(); } });
  await pending;
}

test('ANO_RATE 임계값 전에는 요청을 허용한다', async () => {
  const client = createRateLimitClient({
    apiCount: ANOMALY_RULES.ANO_RATE.threshold - 1,
  });

  assert.deepEqual(
    await checkApiRateLimit({ ipHash: 'ip-hash', client }),
    { limited: false },
  );
  assert.equal(client.inserts.length, 0);
});

test('ANO_RATE 임계값부터 429 결정을 만들고 이벤트를 한 번 기록한다', async () => {
  const client = createRateLimitClient({
    apiCount: ANOMALY_RULES.ANO_RATE.threshold,
  });

  assert.deepEqual(
    await checkApiRateLimit({ ipHash: 'ip-hash', client }),
    { limited: true, retryAfterSeconds: 60 },
  );
  assert.equal(client.inserts.length, 1);
  assert.equal(client.inserts[0].row.rule_id, 'ANO_RATE');
});

test('같은 시간 창의 ANO_RATE 이벤트는 중복 저장하지 않는다', async () => {
  const client = createRateLimitClient({
    apiCount: ANOMALY_RULES.ANO_RATE.threshold + 10,
    existingEventCount: 1,
  });

  const result = await checkApiRateLimit({ ipHash: 'ip-hash', client });
  assert.equal(result.limited, true);
  assert.equal(client.inserts.length, 0);
});

test('다섯 번째 실패 예약번호 조회에서 ANO_CODE_ENUM을 기록한다', async () => {
  const client = createAnomalyClient({ auditCount: 5 });
  await runScheduled((options) => detectCodeEnumeration(
    { ipHash: 'ip-hash', actorId: null, action: 'booking.lookup' },
    { ...options, client },
  ));

  assert.equal(client.inserts[0]?.row.rule_id, 'ANO_CODE_ENUM');
});

test('세 번째 성공 예약에서 ANO_SCALP을 기록한다', async () => {
  const client = createAnomalyClient({ auditCount: 3 });
  await runScheduled((options) => detectScalping(
    { ipHash: 'ip-hash', actorId: null, action: 'booking.create' },
    { ...options, client },
  ));

  assert.equal(client.inserts[0]?.row.rule_id, 'ANO_SCALP');
});

test('열 번째 서로 다른 전화번호 지문에서 ANO_LOOKUP_BF를 기록한다', async () => {
  const priorTargets = Array.from({ length: 9 }, (_, index) => `phone:hash-${index}`);
  const client = createAnomalyClient({ auditTargets: priorTargets });
  await runScheduled((options) => detectLookupBruteForce(
    {
      ipHash: 'ip-hash',
      actorId: null,
      action: 'booking.lookup',
      phoneHash: 'new-hash',
    },
    { ...options, client },
  ));

  assert.equal(client.inserts[0]?.row.rule_id, 'ANO_LOOKUP_BF');
});
