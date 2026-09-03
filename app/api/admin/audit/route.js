import { NextResponse } from 'next/server';
import { withApiLog } from '@/lib/security/apiLog';
import { requireStaff } from '@/lib/security/requireStaff';
import { recordAudit, AUDIT_ACTIONS } from '@/lib/security/audit';
import { listAuditLogs } from '@/lib/security/report';

const VALID_RESULT = ['allow', 'deny'];

/**
 * GET /api/admin/audit?actorId=&action=&result=deny&from=&to=&limit=
 *
 * 응답: { ok: true, logs: [...] }
 *
 * result=deny 로 거르면 "권한 없이 시도한 기록"만 볼 수 있다.
 * 반복 실패가 공격 신호이므로 대시보드에서 가장 많이 쓸 필터다.
 */
export const GET = withApiLog(async (request) => {
  const guard = await requireStaff(request);
  if (guard.denied) return guard.response;

  const params = new URL(request.url).searchParams;
  const result = params.get('result');

  if (result && !VALID_RESULT.includes(result)) {
    return NextResponse.json(
      { ok: false, error: '결과는 allow 또는 deny 만 가능합니다.' },
      { status: 400 }
    );
  }

  try {
    const logs = await listAuditLogs({
      actorId: params.get('actorId') ?? undefined,
      action: params.get('action') ?? undefined,
      result: result ?? undefined,
      from: params.get('from') ?? undefined,
      to: params.get('to') ?? undefined,
      limit: params.get('limit') ?? undefined,
    });

    recordAudit(request, {
      action: AUDIT_ACTIONS.ADMIN_VIEW,
      result: 'allow',
      actorId: guard.user.id,
      actorRole: guard.user.role,
      targetType: 'api',
      targetId: '/api/admin/audit',
    });

    return NextResponse.json({ ok: true, logs });
  } catch (error) {
    console.error('[GET /api/admin/audit]', error);
    return NextResponse.json(
      { ok: false, error: '감사 로그를 불러오지 못했습니다.' },
      { status: 500 }
    );
  }
});
