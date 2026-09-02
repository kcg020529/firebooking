import { NextResponse } from 'next/server';
import { withApiLog } from '@/lib/security/apiLog';
import { recordAudit, AUDIT_ACTIONS } from '@/lib/security/audit';
import { createBooking } from '@/lib/bookings';

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

  const result = await createBooking({
    slotId: body.slotId,
    name: body.name,
    phone: body.phone,
    partySize: body.partySize,
    memo: body.memo,
    source: body.source ?? 'form',
  });

  if (!result.ok) {
    recordAudit(request, {
      action: AUDIT_ACTIONS.BOOKING_CREATE,
      result: 'deny',
      targetType: 'slot',
      targetId: typeof body.slotId === 'string' ? body.slotId : null,
    });

    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  recordAudit(request, {
    action: AUDIT_ACTIONS.BOOKING_CREATE,
    result: 'allow',
    targetType: 'booking',
    // ★ 예약번호만 남긴다. 이름·전화번호는 감사 로그에 넣지 않는다.
    targetId: result.booking.bookingCode,
  });

  // 응답에도 PII 를 되돌려주지 않는다. 예약번호만 있으면 조회가 된다.
  return NextResponse.json({ ok: true, bookingCode: result.booking.bookingCode });
});
