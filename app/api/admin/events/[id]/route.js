import { NextResponse } from 'next/server';
import { withApiLog } from '@/lib/security/apiLog';
import { requireStaff } from '@/lib/security/requireStaff';
import { recordAudit, AUDIT_ACTIONS } from '@/lib/security/audit';
import { setSecurityEventHandled } from '@/lib/security/report';

/**
 * PATCH /api/admin/events/:id
 * body: { handled: boolean }
 *
 * staff·admin 이 확인한 탐지 이벤트를 처리됨(또는 미처리)으로 표시한다.
 * 누가 어떤 이벤트의 상태를 바꿨는지 audit_logs 에 남긴다.
 */
export const PATCH = withApiLog(async (request, { params, getUser }) => {
  const guard = await requireStaff(request, getUser);
  if (guard.denied) return guard.response;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: '요청 형식이 올바르지 않습니다.' },
      { status: 400 },
    );
  }

  const { id } = await params;
  try {
    const result = await setSecurityEventHandled({
      eventId: id,
      handled: body?.handled,
    });

    recordAudit(request, {
      action: AUDIT_ACTIONS.SECURITY_EVENT_HANDLE,
      result: result.ok ? 'allow' : 'deny',
      actorId: guard.user.id,
      actorRole: guard.user.role,
      targetType: 'security_event',
      targetId: String(id),
    });

    const { status = 200, ...payload } = result;
    return NextResponse.json(payload, { status });
  } catch (error) {
    console.error('[PATCH /api/admin/events/:id] 처리 상태 변경 실패:', {
      code: error?.code ?? 'EVENT_HANDLE_FAILED',
    });
    return NextResponse.json(
      { ok: false, error: '처리 상태를 바꾸지 못했습니다.' },
      { status: 500 },
    );
  }
});
