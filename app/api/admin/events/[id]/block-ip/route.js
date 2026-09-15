import { NextResponse } from 'next/server';
import { withApiLog } from '@/lib/security/apiLog';
import { requireStaff } from '@/lib/security/requireStaff';
import { blockSecurityEventIp } from '@/lib/security/ipBlocklist';
import { recordAudit, AUDIT_ACTIONS } from '@/lib/security/audit';

export const POST = withApiLog(async (request, { params, getUser }) => {
  const guard = await requireStaff(request, getUser);
  if (guard.denied) return guard.response;
  if (guard.user.role !== 'admin') {
    recordAudit(request, {
      action: AUDIT_ACTIONS.SECURITY_IP_BLOCK, result: 'deny', actorId: guard.user.id,
      actorRole: guard.user.role, targetType: 'security_event', targetId: 'forbidden',
    });
    return NextResponse.json({ ok: false, error: '관리자 권한이 필요합니다.' }, { status: 403 });
  }
  let body;
  try { body = await request.json(); } catch { body = {}; }
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (reason.length < 10 || reason.length > 200) {
    return NextResponse.json({ ok: false, error: '차단 사유를 10~200자로 입력해 주세요.' }, { status: 400 });
  }
  const { id } = await params;
  try {
    const result = await blockSecurityEventIp({ eventId: id, reason, actorId: guard.user.id });
    recordAudit(request, {
      action: AUDIT_ACTIONS.SECURITY_IP_BLOCK,
      result: result.ok ? 'allow' : 'deny', actorId: guard.user.id, actorRole: guard.user.role,
      targetType: 'security_event', targetId: String(id),
    });
    const { status = 200, ...payload } = result;
    return NextResponse.json(payload, { status });
  } catch (error) {
    console.error('[POST block-ip]', { code: error?.message });
    return NextResponse.json({ ok: false, error: 'IP 차단을 적용하지 못했습니다.' }, { status: 500 });
  }
});
