import { createServerClient } from '../supabase.js';
import { sendCriticalSecurityAlert } from './discordAlert.js';

function getRestConfiguration() {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!baseUrl || !serviceRoleKey) {
    throw new Error('SECURITY_LOG_UNAVAILABLE');
  }

  return { baseUrl, serviceRoleKey };
}

async function insertRestRows(table, rows, fetchImpl = fetch) {
  const { baseUrl, serviceRoleKey } = getRestConfiguration();
  const url = new URL(`/rest/v1/${table}`, baseUrl);
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(rows),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('SECURITY_LOG_WRITE_FAILED');
  }
}

/**
 * 단일 보안 이벤트를 저장하고 critical 시 Discord 알림을 트리거한다.
 *
 * @param {object} event
 * @param {object} [options]
 * @returns {Promise<void>}
 */
export async function recordSecurityEvent(event, options = {}) {
  return recordSecurityEvents([event], options);
}

/**
 * 복수 보안 이벤트를 저장하고 critical 시 Discord 알림을 트리거한다.
 *
 * @param {object[]} events
 * @param {object} [options]
 * @param {object} [options.client] - Supabase JS 클라이언트
 * @param {Function} [options.fetchImpl] - REST API 호출용 fetch
 * @param {object} [options.alertOptions] - sendCriticalSecurityAlert 옵션
 * @returns {Promise<void>}
 */
export async function recordSecurityEvents(events, options = {}) {
  const list = Array.isArray(events) ? events : [events];
  if (list.length === 0) return;

  const { client, supabase, fetchImpl, alertOptions } = options;

  // 1. 기존 보안 이벤트 DB 영속화
  if (fetchImpl) {
    await insertRestRows('security_events', list, fetchImpl);
  } else {
    const dbClient = client ?? supabase ?? createServerClient();
    const { error } = await dbClient
      .from('security_events')
      .insert(list.length === 1 ? list[0] : list);

    if (error) {
      throw error;
    }
  }

  // 2. critical 이벤트에 한해 Discord 알림 발송 (Best-effort, DB 저장 성공 후)
  for (const item of list) {
    if (item.severity === 'critical') {
      try {
        await sendCriticalSecurityAlert(item, alertOptions);
      } catch {
        // Discord 알림 실패가 원본 요청이나 DB 저장을 방해하지 않음
        console.error('[securityEvents] Discord 알림 발송 예외:', {
          ruleId: item.rule_id || item.ruleId,
          code: 'ALERT_DISPATCH_EXCEPTION',
        });
      }
    }
  }
}
