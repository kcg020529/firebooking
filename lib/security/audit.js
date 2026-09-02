import { after } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getClientIp, hashIp } from '@/lib/security/hash';

/**
 * S4 — 감사 로그.
 *
 * "누가 · 언제 · 무엇을 · 결과가 무엇이었나"를 남긴다.
 * api_logs 가 "요청이 왔다"를 남긴다면, 여기는 "무슨 행위를 했고
 * 허용/거부됐나"를 남긴다. 권한 외 접근 탐지의 근거가 된다.
 *
 * ⚠️ 원문 PII 금지 — 이름·전화번호를 넣지 않는다.
 *    target_id 에는 예약번호처럼 사람을 특정하지 않는 식별자만 쓴다.
 *
 * docs/CONVENTIONS.md: 새 API 라우트를 만들면 반드시 이 함수를 호출한다.
 */

/** action 이름은 '대상.동작' 형태로 통일한다. */
export const AUDIT_ACTIONS = {
  BOOKING_CREATE: 'booking.create',
  BOOKING_LOOKUP: 'booking.lookup',
  ADMIN_VIEW: 'admin.view',
  AUTH_LOGIN: 'auth.login',
};

/**
 * 감사 기록. 응답을 보낸 뒤에 쓰므로 사용자 응답이 느려지지 않는다.
 *
 * @param {Request} request
 * @param {object} entry
 * @param {string} entry.action        AUDIT_ACTIONS 중 하나
 * @param {'allow'|'deny'} entry.result
 * @param {string} [entry.targetType]  'booking' | 'course' ...
 * @param {string} [entry.targetId]    ★ PII 아닌 식별자만
 * @param {string} [entry.actorId]
 * @param {string} [entry.actorRole]
 */
export function recordAudit(request, entry) {
  const row = {
    // TODO(A): Supabase Auth 붙이면 세션에서 채운다.
    actor_id: entry.actorId ?? null,
    actor_role: entry.actorRole ?? 'guest',
    action: entry.action,
    target_type: entry.targetType ?? null,
    target_id: entry.targetId ?? null,
    result: entry.result,
    ip_hash: hashIp(getClientIp(request)),
  };

  after(async () => {
    try {
      const supabase = createServerClient();
      await supabase.from('audit_logs').insert(row);
    } catch (error) {
      // 감사 기록 실패가 사용자 요청을 망가뜨리면 안 된다.
      console.error('[audit] 기록 실패:', error);
    }
  });
}
