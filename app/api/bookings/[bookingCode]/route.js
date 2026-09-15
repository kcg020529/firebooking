import { NextResponse } from 'next/server';
import { withApiLog } from '@/lib/security/apiLog';
import { recordAudit, AUDIT_ACTIONS } from '@/lib/security/audit';
import { cancelBooking } from '@/lib/bookings';

export const DELETE = withApiLog(async (request, { params, getUser, getUserId }) => {
  const userId = await getUserId();
  const { bookingCode } = await params;

  if (!userId) {
    return NextResponse.json({ ok: false, error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const result = await cancelBooking(bookingCode, userId);
  recordAudit(request, {
    action: AUDIT_ACTIONS.BOOKING_CANCEL,
    result: result.ok ? 'allow' : 'deny',
    actorId: userId,
    resolveActorRole: async () => (await getUser())?.role,
    targetType: 'booking',
    targetId: bookingCode,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 404 });
  }
  return NextResponse.json({ ok: true, bookingCode: result.bookingCode });
});

