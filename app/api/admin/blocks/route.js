import { NextResponse } from 'next/server';
import { withApiLog } from '@/lib/security/apiLog';
import { requireStaff } from '@/lib/security/requireStaff';
import { listIpBlocks } from '@/lib/security/ipBlocklist';
import { isCloudflareFirewallConfigured } from '@/lib/security/cloudflareFirewall';
import { recordAudit, AUDIT_ACTIONS } from '@/lib/security/audit';

export const GET = withApiLog(async (request, { getUser }) => {
  const guard = await requireStaff(request, getUser);
  if (guard.denied) return guard.response;
  try {
    const blocks = await listIpBlocks();
    recordAudit(request, {
      action: AUDIT_ACTIONS.ADMIN_VIEW, result: 'allow', actorId: guard.user.id,
      actorRole: guard.user.role, targetType: 'api', targetId: '/api/admin/blocks',
    });
    return NextResponse.json({
      ok: true,
      blocks,
      cloudflareConfigured: isCloudflareFirewallConfigured(),
      viewer: { role: guard.user.role },
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'IP 차단 목록을 불러오지 못했습니다.' }, { status: 500 });
  }
});
