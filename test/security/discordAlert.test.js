import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isDiscordAlertConfigured,
  sanitizeEvidence,
  buildDiscordPayload,
  sendCriticalSecurityAlert,
  clearAlertDeduplicationCache,
} from '../../lib/security/discordAlert.js';
import { recordSecurityEvent, recordSecurityEvents } from '../../lib/security/events.js';

test('isDiscordAlertConfigured: 환경변수 설정 여부를 정확히 판별한다', () => {
  assert.equal(isDiscordAlertConfigured({ DISCORD_SECURITY_WEBHOOK_URL: 'https://discord.com/api/webhooks/123/abc' }), true);
  assert.equal(isDiscordAlertConfigured({ DISCORD_SECURITY_WEBHOOK_URL: '   ' }), false);
  assert.equal(isDiscordAlertConfigured({}), false);
  assert.equal(isDiscordAlertConfigured({ DISCORD_SECURITY_WEBHOOK_URL: undefined }), false);
});

test('sanitizeEvidence: 빈 값이거나 비문자열이면 기본 안내 문구를 반환한다', () => {
  assert.equal(sanitizeEvidence(''), '(상세 증거 없음)');
  assert.equal(sanitizeEvidence('   '), '(상세 증거 없음)');
  assert.equal(sanitizeEvidence(null), '(상세 증거 없음)');
  assert.equal(sanitizeEvidence(undefined), '(상세 증거 없음)');
  assert.equal(sanitizeEvidence(123), '(상세 증거 없음)');
});

test('sanitizeEvidence: PII(전화번호, 주민번호, 카드번호, 이메일, 이름)를 철저히 마스킹한다', () => {
  const raw = '이름은 홍길동, 연락처 010-1234-5678 chulsoo@example.com 900101-1234567 1234-5678-9012-3456';
  const sanitized = sanitizeEvidence(raw);

  assert.equal(sanitized.includes('010-1234-5678'), false, '전화번호 노출 금지');
  assert.equal(sanitized.includes('chulsoo@example.com'), false, '이메일 노출 금지');
  assert.equal(sanitized.includes('900101-1234567'), false, '주민번호 노출 금지');
  assert.equal(sanitized.includes('1234-5678-9012-3456'), false, '카드번호 노출 금지');
  assert.equal(sanitized.includes('홍길동'), false, '이름 노출 금지');
  assert.ok(sanitized.includes('홍*동'), '이름 마스킹 확인');
});

test('sanitizeEvidence: 비밀 패턴(JWT, API키, DeepSeek키, Discord웹훅URL, Bearer토큰)을 마스킹한다', () => {
  const fakeWebhook = 'https://discord.com/api/webhooks/999999/SECRET_TOKEN_ABC';
  const fakeDeepSeek = 'sk-deepseek-abcdef1234567890';
  const fakeJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0';
  const fakeBearer = 'Bearer ya29.a0AfH6SMDh12345678';

  const env = {
    DISCORD_SECURITY_WEBHOOK_URL: fakeWebhook,
    DEEPSEEK_API_KEY: fakeDeepSeek,
  };

  const raw = '유출 시도: ' + fakeWebhook + ' 및 ' + fakeDeepSeek + ' 및 ' + fakeJwt + ' 및 ' + fakeBearer;
  const sanitized = sanitizeEvidence(raw, env);

  assert.equal(sanitized.includes('SECRET_TOKEN_ABC'), false, 'Webhook URL 원문 노출 금지');
  assert.equal(sanitized.includes(fakeDeepSeek), false, 'DeepSeek 키 원문 노출 금지');
  assert.equal(sanitized.includes(fakeJwt), false, 'JWT 원문 노출 금지');
  assert.equal(sanitized.includes('ya29.a0AfH6SMDh'), false, 'Bearer 토큰 원문 노출 금지');
  assert.ok(sanitized.includes('[REDACTED_WEBHOOK]'));
  assert.ok(sanitized.includes('[REDACTED_KEY]'));
  assert.ok(sanitized.includes('[REDACTED_SECRET]'));
  assert.ok(sanitized.includes('[REDACTED_TOKEN]'));
});

test('sanitizeEvidence: 최대 200자로 안전하게 절단된다', () => {
  const longText = 'A'.repeat(500);
  const sanitized = sanitizeEvidence(longText);
  assert.ok(sanitized.length <= 200, '200자 이하로 절단되어야 함');
});

test('buildDiscordPayload: 필수 Embed 필드를 생성하며 IP, actor_id를 절대 포함하지 않는다', () => {
  const event = {
    rule_id: 'AUTHZ_ADMIN',
    category: 'authz',
    severity: 'critical',
    actor_id: 'user-uuid-1234',
    ip_hash: 'hash-ip-5678',
    evidence: 'guest 역할이 /admin/secrets 접근 시도',
    ts: '2026-09-11T12:00:00.000Z',
  };

  const payload = buildDiscordPayload(event);

  assert.equal(payload.username, 'Firebooking Security');
  assert.equal(payload.embeds.length, 1);
  const embed = payload.embeds[0];
  assert.equal(embed.title, '🚨 Firebooking 긴급 보안 경보');
  assert.equal(embed.color, 0xdc2626);
  assert.ok(embed.fields.some((f) => f.name === '규칙' && f.value === 'AUTHZ_ADMIN'));
  assert.ok(embed.fields.some((f) => f.name === '심각도' && f.value === 'critical'));

  const payloadString = JSON.stringify(payload);
  assert.equal(payloadString.includes('user-uuid-1234'), false, 'actor_id가 페이로드에 포함되지 않아야 함');
  assert.equal(payloadString.includes('hash-ip-5678'), false, 'ip_hash가 페이로드에 포함되지 않아야 함');
});

test('sendCriticalSecurityAlert: 비정상 이벤트 입력 시 invalid_event 반환', async () => {
  const res1 = await sendCriticalSecurityAlert(null);
  assert.deepEqual(res1, { ok: false, error: 'invalid_event' });

  const res2 = await sendCriticalSecurityAlert('string');
  assert.deepEqual(res2, { ok: false, error: 'invalid_event' });
});

test('sendCriticalSecurityAlert: warn/info 심각도는 skip 처리되고 fetch를 호출하지 않는다', async () => {
  let fetchCalled = false;
  const fetchImpl = async () => {
    fetchCalled = true;
    return { ok: true };
  };

  const resWarn = await sendCriticalSecurityAlert(
    { rule_id: 'ANO_LOGIN_BF', severity: 'warn', evidence: '로그인 실패 5회' },
    { fetchImpl, webhookUrl: 'https://fake-discord.local/webhook' }
  );
  assert.deepEqual(resWarn, { ok: true, skipped: true, reason: 'non_critical' });

  const resInfo = await sendCriticalSecurityAlert(
    { rule_id: 'PII_PHONE', severity: 'info', evidence: '전화번호 감지' },
    { fetchImpl, webhookUrl: 'https://fake-discord.local/webhook' }
  );
  assert.deepEqual(resInfo, { ok: true, skipped: true, reason: 'non_critical' });

  assert.equal(fetchCalled, false, 'warn/info는 fetch를 호출하지 않아야 함');
});

test('sendCriticalSecurityAlert: Webhook URL 미설정 시 not_configured 반환 및 fetch 미호출', async () => {
  let fetchCalled = false;
  const fetchImpl = async () => {
    fetchCalled = true;
    return { ok: true };
  };

  const res = await sendCriticalSecurityAlert(
    { rule_id: 'AUTHZ_ADMIN', severity: 'critical', evidence: '비인가 접근' },
    { fetchImpl, env: { DISCORD_SECURITY_WEBHOOK_URL: '' } }
  );

  assert.deepEqual(res, { ok: true, skipped: true, reason: 'not_configured' });
  assert.equal(fetchCalled, false);
});

test('sendCriticalSecurityAlert: 정상 발송 시 200/204 응답을 성공 처리한다', async () => {
  clearAlertDeduplicationCache();
  let requestedUrl = null;
  let requestedOptions = null;

  const fetchImpl = async (url, options) => {
    requestedUrl = url;
    requestedOptions = options;
    return { ok: true, status: 204 };
  };

  const res = await sendCriticalSecurityAlert(
    { rule_id: 'INJ_SQL', severity: 'critical', evidence: 'SELECT * FROM users;' },
    {
      webhookUrl: 'https://fake-discord.local/webhook',
      fetchImpl,
    }
  );

  assert.deepEqual(res, { ok: true, skipped: false });
  assert.equal(requestedUrl, 'https://fake-discord.local/webhook');
  assert.equal(requestedOptions.method, 'POST');
  assert.equal(requestedOptions.headers['Content-Type'], 'application/json');

  const body = JSON.parse(requestedOptions.body);
  assert.equal(body.username, 'Firebooking Security');
  assert.equal(body.embeds[0].fields[0].value, 'INJ_SQL');
});

test('sendCriticalSecurityAlert: 5분 중복 억제 창 내에서는 동일 이벤트 발송을 건너뛴다', async () => {
  clearAlertDeduplicationCache();
  let fetchCount = 0;
  const fetchImpl = async () => {
    fetchCount += 1;
    return { ok: true, status: 200 };
  };

  let simulatedTime = 1000000;
  const now = () => simulatedTime;

  const event = {
    rule_id: 'AUTHZ_ADMIN',
    severity: 'critical',
    evidence: 'guest가 /admin 접근',
  };

  // 1번째: 발송 성공
  const first = await sendCriticalSecurityAlert(event, {
    webhookUrl: 'https://fake-discord.local/webhook',
    fetchImpl,
    now,
  });
  assert.deepEqual(first, { ok: true, skipped: false });
  assert.equal(fetchCount, 1);

  // 2번째: 1분 뒤 동일 이벤트 -> 중복 억제
  simulatedTime += 60 * 1000;
  const second = await sendCriticalSecurityAlert(event, {
    webhookUrl: 'https://fake-discord.local/webhook',
    fetchImpl,
    now,
  });
  assert.deepEqual(second, { ok: true, skipped: true, reason: 'deduplicated' });
  assert.equal(fetchCount, 1);

  // 3번째: 5분 1초 뒤 -> 억제 만료 후 재발송 성공
  simulatedTime += 4 * 60 * 1000 + 2000;
  const third = await sendCriticalSecurityAlert(event, {
    webhookUrl: 'https://fake-discord.local/webhook',
    fetchImpl,
    now,
  });
  assert.deepEqual(third, { ok: true, skipped: false });
  assert.equal(fetchCount, 2);
});

test('sendCriticalSecurityAlert: 429(Rate Limit) 발생 시 1회 재시도하여 성공한다', async () => {
  clearAlertDeduplicationCache();
  let attempts = 0;
  const sleepCalls = [];

  const fetchImpl = async () => {
    attempts += 1;
    if (attempts === 1) {
      return { ok: false, status: 429 };
    }
    return { ok: true, status: 200 };
  };

  const res = await sendCriticalSecurityAlert(
    { rule_id: 'LEAK_SECRET', severity: 'critical', evidence: '토큰 유출 의심' },
    {
      webhookUrl: 'https://fake-discord.local/webhook',
      fetchImpl,
      sleepImpl: async (ms) => sleepCalls.push(ms),
    }
  );

  assert.deepEqual(res, { ok: true, skipped: false });
  assert.equal(attempts, 2, '2회 시도(최초 + 1회 재시도)여야 함');
  assert.equal(sleepCalls.length, 1);
});

test('sendCriticalSecurityAlert: 500 서버 장애 재시도 후에도 실패하면 delivery_failed 반환', async () => {
  clearAlertDeduplicationCache();
  let attempts = 0;

  const fetchImpl = async () => {
    attempts += 1;
    return { ok: false, status: 500 };
  };

  const res = await sendCriticalSecurityAlert(
    { rule_id: 'ANO_RATE', severity: 'critical', evidence: '초당 100회 요청 초과' },
    {
      webhookUrl: 'https://fake-discord.local/webhook',
      fetchImpl,
      sleepImpl: async () => {},
    }
  );

  assert.deepEqual(res, { ok: false, error: 'delivery_failed' });
  assert.equal(attempts, 2, '최대 2회 시도 후 실패 반환');
});

test('sendCriticalSecurityAlert: 네트워크 예외 발생 시 안전하게 캡처되어 delivery_failed 반환', async () => {
  clearAlertDeduplicationCache();
  let attempts = 0;

  const fetchImpl = async () => {
    attempts += 1;
    throw new Error('ECONNRESET');
  };

  const res = await sendCriticalSecurityAlert(
    { rule_id: 'ANO_RATE', severity: 'critical', evidence: '연결 에러 테스트' },
    {
      webhookUrl: 'https://fake-discord.local/webhook',
      fetchImpl,
      sleepImpl: async () => {},
    }
  );

  assert.deepEqual(res, { ok: false, error: 'delivery_failed' });
  assert.equal(attempts, 2);
});

test('recordSecurityEvents: critical 이벤트는 DB 저장 후 Discord 알림을 호출한다', async () => {
  clearAlertDeduplicationCache();
  const dbInserts = [];
  const fakeClient = {
    from(table) {
      return {
        async insert(data) {
          dbInserts.push({ table, data });
          return { error: null };
        },
      };
    },
  };

  let discordCalled = false;
  const mockFetch = async () => {
    discordCalled = true;
    return { ok: true, status: 200 };
  };

  await recordSecurityEvent(
    {
      rule_id: 'AUTHZ_ADMIN',
      category: 'authz',
      severity: 'critical',
      evidence: '관리자 경로 침입',
    },
    {
      client: fakeClient,
      alertOptions: {
        webhookUrl: 'https://fake-discord.local/webhook',
        fetchImpl: mockFetch,
      },
    }
  );

  assert.equal(dbInserts.length, 1);
  assert.equal(dbInserts[0].table, 'security_events');
  assert.equal(discordCalled, true, 'critical 이벤트는 Discord 알림이 호출되어야 함');
});

test('recordSecurityEvents: Discord 알림이 실패해도 DB 저장 및 정상 실행을 보장한다 (Best-effort)', async () => {
  clearAlertDeduplicationCache();
  const dbInserts = [];
  const fakeClient = {
    from(table) {
      return {
        async insert(data) {
          dbInserts.push({ table, data });
          return { error: null };
        },
      };
    },
  };

  const failingFetch = async () => {
    throw new Error('Discord Down');
  };

  await assert.doesNotReject(async () => {
    await recordSecurityEvent(
      {
        rule_id: 'LEAK_SECRET',
        category: 'leak',
        severity: 'critical',
        evidence: '시크릿 유출',
      },
      {
        client: fakeClient,
        alertOptions: {
          webhookUrl: 'https://fake-discord.local/webhook',
          fetchImpl: failingFetch,
          sleepImpl: async () => {},
        },
      }
    );
  });

  assert.equal(dbInserts.length, 1);
});

test('sendCriticalSecurityAlert: 전송 실패 시 콘솔 에러 로그에 Webhook URL이 절대 노출되지 않는다', async () => {
  clearAlertDeduplicationCache();
  const capturedLogs = [];
  const originalError = console.error;
  console.error = (...args) => {
    capturedLogs.push(args.map(String).join(' '));
  };

  const secretWebhookUrl = 'https://discord.com/api/webhooks/123456789/CONFIDENTIAL_TOKEN_XYZ';
  try {
    const fetchImpl = async () => ({ ok: false, status: 500 });
    await sendCriticalSecurityAlert(
      { rule_id: 'ANO_RATE', severity: 'critical', evidence: '과도한 트래픽' },
      {
        webhookUrl: secretWebhookUrl,
        fetchImpl,
        sleepImpl: async () => {},
      }
    );
  } finally {
    console.error = originalError;
  }

  const logText = capturedLogs.join('\n');
  assert.equal(logText.includes('CONFIDENTIAL_TOKEN_XYZ'), false, '로그에 Webhook 토큰이 노출되지 않아야 함');
  assert.equal(logText.includes(secretWebhookUrl), false, '로그에 Webhook URL이 노출되지 않아야 함');
});

