import { NextResponse } from 'next/server';
import { getCurrentUser, isStaff } from '@/lib/auth';
import { recordAudit, AUDIT_ACTIONS } from '@/lib/security/audit';
import { recordUnauthorizedAdminAccess } from '@/lib/security/authz';

/**
 * 관리자 API 권한 가드.
 *
 * app/admin/layout.js 가 화면을 막는 것과 같은 일을 API 에서 한다.
 * 화면만 막으면 API 를 직접 호출해 우회할 수 있다 —
 * 이 프로젝트에서 실제로 확인한 적 있는 우회 경로다.
 *
 * 사용법:
 *   export const GET = withApiLog(async (request) => {
 *     const guard = await requireStaff(request);
 *     if (guard.denied) return guard.response;
 *     // guard.user 로 이어서 진행
 *   });
 */
export async function requireStaff(request) {
  const user = await getCurrentUser();

  if (isStaff(user)) {
    return { denied: false, user };
  }

  const path = new URL(request.url).pathname;

  // 화면 접근과 같은 규칙(AUTHZ_ADMIN)으로 기록한다.
  // 대시보드에서 "화면으로 들어왔나 API 로 찔렀나"를 구분할 필요는 없고,
  // "권한 없이 관리자 영역에 접근했다"는 사실이 같기 때문이다.
  await recordUnauthorizedAdminAccess({ path, user });

  recordAudit(request, {
    action: AUDIT_ACTIONS.ADMIN_VIEW,
    result: 'deny',
    actorId: user?.id ?? null,
    actorRole: user?.role,
    targetType: 'api',
    targetId: path,
  });

  return {
    denied: true,
    user,
    response: NextResponse.json(
      { ok: false, error: '관리자 권한이 필요합니다.' },
      { status: 403 }
    ),
  };
}
