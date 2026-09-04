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
 * 토큰을 검증해 "누가 로그인했나"만 알아낸다. 역할은 조회하지 않는다.
 *
 * ⚠️ getSession() 이 아니라 getUser() 를 쓴다.
 *    getSession() 은 쿠키에 담긴 값을 그대로 믿는다 — 위조 가능하다.
 *    getUser() 는 Supabase 서버에 토큰을 검증받는다.
 *    권한 판정에 쓰는 값이므로 검증된 쪽을 써야 한다.
 *
 * 왕복 1회. 역할이 필요없는 곳(예약을 계정에 묶기 등)은 이걸 쓴다.
 *
 * @returns {Promise<{ id: string, email: string } | null>}
 */
export async function getAuthUser() {
  const cookieStore = await cookies();
  const supabase = createAuthServerClient(cookieStore);

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  return { id: user.id, email: user.email };
}

/**
 * 검증된 사용자에 역할을 붙인다. 왕복 1회가 더 든다.
 *
 * 역할은 profiles 에 있다. RLS 상 본인 행은 읽을 수 있지만,
 * 로그인 직후 트리거가 아직 안 돌았을 가능성을 감안해
 * service_role 로 조회하고 없으면 기본값을 준다.
 */
async function attachRole(authUser) {
  if (!authUser) return null;

  const admin = createServerClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('role, display_name')
    .eq('id', authUser.id)
    .maybeSingle();

  return {
    id: authUser.id,
    email: authUser.email,
    role: profile?.role ?? ROLES.USER,
    displayName: profile?.display_name ?? null,
  };
}

/**
 * 현재 로그인한 사용자(역할 포함). 비로그인이면 null.
 *
 * 왕복 2회다 — 권한 판정처럼 역할이 꼭 필요한 곳에서만 쓴다.
 *
 * @returns {Promise<{ id: string, email: string, role: string } | null>}
 */
export async function getCurrentUser() {
  return attachRole(await getAuthUser());
}

/**
 * 요청 하나 동안 공유하는 인증 조회 캐시.
 *
 * 같은 요청에서 여러 곳(핸들러·권한 가드·로깅)이 "누구냐"를 물어도
 * Supabase 왕복은 최대 2회(토큰 검증 1 + 역할 조회 1)로 묶인다.
 * 역할을 아무도 안 물으면 역할 조회는 아예 일어나지 않는다.
 *
 * 조회 실패는 비로그인(null)으로 처리한다 — 로깅 때문에 요청이
 * 실패하면 안 되고, 권한 판정은 null 을 권한 없음으로 보기 때문이다.
 */
export function createRequestAuth() {
  let authUserPromise = null;
  let fullUserPromise = null;

  function loadAuthUser() {
    if (!authUserPromise) authUserPromise = getAuthUser().catch(() => null);
    return authUserPromise;
  }

  return {
    /** 왕복 1회. id 만 필요할 때. */
    async getUserId() {
      const authUser = await loadAuthUser();
      return authUser?.id ?? null;
    },

    /** 왕복 2회. 역할이 필요할 때만. */
    getUser() {
      if (!fullUserPromise) {
        fullUserPromise = loadAuthUser()
          .then(attachRole)
          .catch(() => null);
      }
      return fullUserPromise;
    },
  };
}

/** staff 또는 admin 인가. 보안 대시보드·감사 로그 접근 기준. */
export function isStaff(user) {
  return Boolean(user) && STAFF_ROLES.includes(user.role);
}

export function isAdmin(user) {
  return Boolean(user) && user.role === ROLES.ADMIN;
}
