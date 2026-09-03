import { NextResponse } from 'next/server';
import { withApiLog } from '@/lib/security/apiLog';
import { recordAudit, AUDIT_ACTIONS } from '@/lib/security/audit';
import { createBooking } from '@/lib/bookings';
import { getCurrentUser } from '@/lib/auth';

/**
 * POST /api/bookings
 *
 * body: { slotId, name, phone, partySize, memo?, source }
 * 성공: { ok: true, bookingCode }
 * 실패: { ok: false, error: '한국어 메시지' }
 *
 * 검증·정원 확인은 전부 lib/bookings.js 의 createBooking() 이 한다.
 * 챗봇 tool 도 같은 함수를 부르므로 두 경로의 규칙이 절대 갈라지지 않는다.
 */
export const POST = withApiLog(async (request) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: '요청 형식이 올바르지 않습니다.' },
      { status: 400 }
    );
  }

  // 로그인 상태면 예약을 계정에 묶는다. 비로그인 예약도 그대로 허용한다
  // (bookings.user_id 는 nullable). 예약번호로만 조회하게 된다.
  const user = await getCurrentUser();

  const result = await createBooking({
    slotId: body.slotId,
    name: body.name,
    phone: body.phone,
    partySize: body.partySize,
    memo: body.memo,
    source: body.source ?? 'form',
    userId: user?.id ?? null,
  });

  if (!result.ok) {
    recordAudit(request, {
      action: AUDIT_ACTIONS.BOOKING_CREATE,
      result: 'deny',
      actorId: user?.id ?? null,
      actorRole: user?.role,
      targetType: 'slot',
      targetId: typeof body.slotId === 'string' ? body.slotId : null,
    });

    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  recordAudit(request, {
    action: AUDIT_ACTIONS.BOOKING_CREATE,
    result: 'allow',
    actorId: user?.id ?? null,
    actorRole: user?.role,
    targetType: 'booking',
    // ★ 예약번호만 남긴다. 이름·전화번호는 감사 로그에 넣지 않는다.
    targetId: result.booking.bookingCode,
  });

  // 응답에도 PII 를 되돌려주지 않는다. 예약번호만 있으면 조회가 된다.
  return NextResponse.json({ ok: true, bookingCode: result.booking.bookingCode });
});
