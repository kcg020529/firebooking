import { cookies } from 'next/headers';
import { createAuthServerClient } from '@/lib/supabaseAuth';
import { createServerClient } from '@/lib/supabase';

/**
 * "지금 요청한 사람이 누구인가"를 서버에서 판정한다.
 *
 * 감사 로그의 actor_id, 권한 검사, 내 예약 조회가 전부 여기를 통과한다.
 */

export const ROLES = {
  GUEST: 'guest',
  USER: 'user',
  STAFF: 'staff',
  ADMIN: 'admin',
};

const STAFF_ROLES = [ROLES.STAFF, ROLES.ADMIN];

/**
 * 현재 로그인한 사용자. 비로그인이면 null.
 *
 * ⚠️ getSession() 이 아니라 getUser() 를 쓴다.
 *    getSession() 은 쿠키에 담긴 값을 그대로 믿는다 — 위조 가능하다.
 *    getUser() 는 Supabase 서버에 토큰을 검증받는다.
 *    권한 판정에 쓰는 값이므로 검증된 쪽을 써야 한다.
 *
 * @returns {Promise<{ id: string, email: string, role: string } | null>}
 */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const supabase = createAuthServerClient(cookieStore);

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  // 역할은 profiles 에 있다. RLS 상 본인 행은 읽을 수 있지만,
  // 로그인 직후 트리거가 아직 안 돌았을 가능성을 감안해
  // service_role 로 조회하고 없으면 기본값을 준다.
  const admin = createServerClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email,
    role: profile?.role ?? ROLES.USER,
    displayName: profile?.display_name ?? null,
  };
}

/** staff 또는 admin 인가. 보안 대시보드·감사 로그 접근 기준. */
export function isStaff(user) {
  return Boolean(user) && STAFF_ROLES.includes(user.role);
}

export function isAdmin(user) {
  return Boolean(user) && user.role === ROLES.ADMIN;
}
