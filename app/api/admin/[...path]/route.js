import { NextResponse } from 'next/server';
import { withApiLog } from '@/lib/security/apiLog';
import { requireStaff } from '@/lib/security/requireStaff';
import { recordUnknownAdminPath } from '@/lib/security/authz';

async function handleUnknownAdminApi(request, { getUser }) {
  const guard = await requireStaff(request, getUser);
  const path = new URL(request.url).pathname;

  await recordUnknownAdminPath({ path, user: guard.user });
  if (guard.denied) return guard.response;

  return NextResponse.json(
    { ok: false, error: '존재하지 않는 관리자 API입니다.' },
    { status: 404 },
  );
}

export const GET = withApiLog(handleUnknownAdminApi);
export const HEAD = withApiLog(handleUnknownAdminApi);
export const POST = withApiLog(handleUnknownAdminApi);
export const PUT = withApiLog(handleUnknownAdminApi);
export const PATCH = withApiLog(handleUnknownAdminApi);
export const DELETE = withApiLog(handleUnknownAdminApi);
export const OPTIONS = withApiLog(handleUnknownAdminApi);
