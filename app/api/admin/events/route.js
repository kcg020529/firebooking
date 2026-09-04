import { NextResponse } from 'next/server';
import { withApiLog } from '@/lib/security/apiLog';
import { requireStaff } from '@/lib/security/requireStaff';
import { recordAudit, AUDIT_ACTIONS } from '@/lib/security/audit';
import { listSecurityEvents, summarizeSecurityEvents } from '@/lib/security/report';

const VALID_SEVERITY = ['info', 'warn', 'critical'];
const VALID_CATEGORY = ['pii', 'injection', 'anomaly', 'authz', 'leak'];

/**
 * GET /api/admin/events?severity=critical&category=authz&from=&to=&limit=
 *
 * 응답: { ok: true, events: [...], summary: { total, bySeverity, byRule, unhandled } }
 *
 * summary 를 같이 주는 이유: 대시보드가 "이벤트 목록"과 "심각도별 건수"를
 * 따로 두 번 부르지 않아도 되게. 두 번 부르면 그 사이에 새 이벤트가 들어와
 * 목록과 합계가 어긋난다.
 */
export const GET = withApiLog(async (request, { getUser }) => {
  const guard = await requireStaff(request, getUser);
  if (guard.denied) return guard.response;

  const params = new URL(request.url).searchParams;
  const severity = params.get('severity');
  const category = params.get('category');

  if (severity && !VALID_SEVERITY.includes(severity)) {
    return NextResponse.json(
      { ok: false, error: '심각도는 info, warn, critical 중 하나여야 합니다.' },
      { status: 400 }
    );
  }
  if (category && !VALID_CATEGORY.includes(category)) {
    return NextResponse.json(
      { ok: false, error: '분류가 올바르지 않습니다.' },
      { status: 400 }
    );
  }

  const filters = {
    severity: severity ?? undefined,
    category: category ?? undefined,
    from: params.get('from') ?? undefined,
    to: params.get('to') ?? undefined,
    limit: params.get('limit') ?? undefined,
  };

  try {
    const [events, summary] = await Promise.all([
      listSecurityEvents(filters),
      summarizeSecurityEvents({ from: filters.from, to: filters.to }),
    ]);

    recordAudit(request, {
      action: AUDIT_ACTIONS.ADMIN_VIEW,
      result: 'allow',
      actorId: guard.user.id,
      actorRole: guard.user.role,
      targetType: 'api',
      targetId: '/api/admin/events',
    });

    return NextResponse.json({ ok: true, events, summary });
  } catch (error) {
    console.error('[GET /api/admin/events]', error);
    return NextResponse.json(
      { ok: false, error: '보안 이벤트를 불러오지 못했습니다.' },
      { status: 500 }
    );
  }
});
