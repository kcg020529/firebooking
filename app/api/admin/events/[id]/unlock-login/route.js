import { NextResponse } from 'next/server';
import { withApiLog } from '@/lib/security/apiLog';
import { requireStaff } from '@/lib/security/requireStaff';
import { clearLoginLock } from '@/lib/security/loginProtection';
import { recordAudit, AUDIT_ACTIONS } from '@/lib/security/audit';

export const POST = withApiLog(async (request, { params, getUser }) => {
  const guard = await requireStaff(request, getUser);
  if (guard.denied) return guard.response;
  const { id } = await params;
  try {
    const result = await clearLoginLock({ eventId: id });
    recordAudit(request, {
      action: AUDIT_ACTIONS.SECURITY_LOGIN_UNLOCK,
      result: result.ok ? 'allow' : 'deny', actorId: guard.user.id, actorRole: guard.user.role,
      targetType: 'security_event', targetId: String(id),
    });
    const { status = 200, ...payload } = result;
    return NextResponse.json(payload, { status });
  } catch (error) {
    console.error('[POST unlock-login]', { code: error?.code ?? 'LOGIN_UNLOCK_FAILED' });
    return NextResponse.json({ ok: false, error: '로그인 제한을 해제하지 못했습니다.' }, { status: 500 });
  }
});

