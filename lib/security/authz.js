import { after } from 'next/server';
import { headers } from 'next/headers';
import { createServerClient } from '@/lib/supabase';
import { hashIp } from '@/lib/security/hash';

/**
 * AUTHZ_ADMIN — 권한 외 접근 탐지.
 *
 * 화면을 가리는 것만으로는 부족하다. 누가 언제 관리자 영역에 들어오려
 * 했는지가 남아야 "탐지"가 된다. 시연 5번에서 보여줄 지점이다.
 *
 * 기록 위치가 두 곳인 이유:
 *   - security_events → 대시보드에 뜨는 탐지 결과
 *   - audit_logs      → "누가 무엇을 시도했고 거부됐다"는 감사 기록
 * 성격이 달라서 한쪽으로 합치지 않는다.
 */

/** 서버 컴포넌트에는 request 객체가 없어 헤더에서 IP 를 꺼낸다. */
async function getIpHashFromHeaders() {
  const headerList = await headers();
  const forwarded = headerList.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : headerList.get('x-real-ip');
  return hashIp(ip);
}

/**
 * 관리자 영역 비인가 접근을 기록한다.
 *
 * @param {object} params
 * @param {string} params.path              접근하려던 경로
 * @param {{id: string, role: string}|null} params.user  비로그인이면 null
 */
export async function recordUnauthorizedAdminAccess({ path, user }) {
  const ipHash = await getIpHashFromHeaders();

  const actorId = user?.id ?? null;
  const actorRole = user?.role ?? 'guest';

  after(async () => {
    try {
      const supabase = createServerClient();

      await supabase.from('security_events').insert({
        rule_id: 'AUTHZ_ADMIN',
        category: 'authz',
        severity: 'critical',
        actor_id: actorId,
        ip_hash: ipHash,
        // ★ 경로와 역할만 남긴다. 이메일·이름은 넣지 않는다.
        evidence: `${actorRole} 역할이 ${path} 접근 시도`,
      });

      await supabase.from('audit_logs').insert({
        actor_id: actorId,
        actor_role: actorRole,
        action: 'admin.view',
        target_type: 'page',
        target_id: path,
        result: 'deny',
        ip_hash: ipHash,
      });
    } catch (error) {
      console.error('[authz] 기록 실패:', error);
    }
  });
}

/** 관리자 영역 정상 접근도 감사 로그에 남긴다. 허용 기록이 없으면 비교 대상이 없다. */
export async function recordAdminAccess({ path, user }) {
  const ipHash = await getIpHashFromHeaders();

  after(async () => {
    try {
      const supabase = createServerClient();
      await supabase.from('audit_logs').insert({
        actor_id: user.id,
        actor_role: user.role,
        action: 'admin.view',
        target_type: 'page',
        target_id: path,
        result: 'allow',
        ip_hash: ipHash,
      });
    } catch (error) {
      console.error('[authz] 기록 실패:', error);
    }
  });
}
