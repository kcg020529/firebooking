import { NextResponse } from 'next/server';
import { withApiLog } from '@/lib/security/apiLog';
import { requireStaff } from '@/lib/security/requireStaff';
import { unblockIp } from '@/lib/security/ipBlocklist';
import { recordAudit, AUDIT_ACTIONS } from '@/lib/security/audit';

export const DELETE = withApiLog(async (request, { params, getUser }) => {
  const guard = await requireStaff(request, getUser);
  if (guard.denied) return guard.response;
  if (guard.user.role !== 'admin') {
    recordAudit(request, {
      action: AUDIT_ACTIONS.SECURITY_IP_UNBLOCK, result: 'deny', actorId: guard.user.id,
      actorRole: guard.user.role, targetType: 'ip_block', targetId: 'forbidden',
    });
    return NextResponse.json({ ok: false, error: '관리자 권한이 필요합니다.' }, { status: 403 });
  }
  const { id } = await params;
  try {
    const block = await unblockIp({ blockId: id, actorId: guard.user.id });
    recordAudit(request, {
      action: AUDIT_ACTIONS.SECURITY_IP_UNBLOCK, result: 'allow',
      actorId: guard.user.id, actorRole: guard.user.role, targetType: 'ip_block', targetId: String(id),
    });
    return NextResponse.json({ ok: true, block });
  } catch (error) {
    console.error('[DELETE IP block]', { code: error?.message });
    return NextResponse.json({ ok: false, error: 'Cloudflare 차단 해제에 실패해 기존 차단을 유지합니다.' }, { status: 502 });
  }
});
