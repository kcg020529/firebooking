import { NextResponse } from 'next/server';
import { withApiLog } from '@/lib/security/apiLog';
import { requireStaff } from '@/lib/security/requireStaff';
import { hashIp } from '@/lib/security/hash';
import { revealSecurityEventIp } from '@/lib/security/report';

/**
 * POST /api/admin/events/:id/ip
 * body: { reason }
 *
 * critical 사고의 암호화 IP는 admin만 복호화할 수 있다.
 * 조회 사유와 허용·거부 결과는 audit_logs에 남는다.
 */
export const POST = withApiLog(async (
  request,
  { params, getUser, networkContext },
) => {
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
    const result = await revealSecurityEventIp({
      eventId: id,
      reason: body?.reason,
      user: guard.user,
      adminIpHash: hashIp(networkContext.ip),
    });
    const { status = 200, ...payload } = result;
    return NextResponse.json(payload, { status });
  } catch (error) {
    console.error('[POST /api/admin/events/:id/ip] IP 조회 실패:', {
      code: error?.code ?? 'IP_REVEAL_FAILED',
    });
    return NextResponse.json(
      { ok: false, error: '사고 IP를 조회하지 못했습니다.' },
      { status: 500 },
    );
  }
});
