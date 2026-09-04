import { NextResponse } from 'next/server';
import { withApiLog } from '@/lib/security/apiLog';
import { recordAudit, AUDIT_ACTIONS } from '@/lib/security/audit';
import { detectCodeEnumeration } from '@/lib/security/rules';
import { getClientIp, hashIp } from '@/lib/security/hash';
import { lookupBookings } from '@/lib/bookings';

/**
 * GET /api/bookings/lookup?code=GB-XXXXX&phone=010-1234-5678
 *
 * 비로그인 예약 조회. 예약번호와 전화번호를 **둘 다** 요구한다.
 * 로그인 사용자는 /my 에서 user_id 기준으로 본다.
 *
 * 성공: { ok: true, bookings: [...] }   ← 이름·전화번호는 포함하지 않는다
 * 실패: { ok: false, error: '한국어 메시지' }
 *
 * 실패는 audit_logs 에 deny 로 남고, 반복되면 ANO_CODE_ENUM 이 뜬다.
 */
export const GET = withApiLog(async (request, { getUser, getUserId }) => {
  const params = new URL(request.url).searchParams;
  const code = params.get('code');
  const phone = params.get('phone');

  // 조회 자체는 로그인과 무관하다(예약번호+전화번호로 대조). 여기서
  // 필요한 건 기록용 id 뿐이라 역할은 응답 뒤에 채운다.
  const userId = await getUserId();
  const ipHash = hashIp(getClientIp(request));

  const result = await lookupBookings({ code, phone });

  if (!result.ok) {
    recordAudit(request, {
      action: AUDIT_ACTIONS.BOOKING_LOOKUP,
      result: 'deny',
      actorId: userId,
      resolveActorRole: async () => (await getUser())?.role,
      targetType: 'booking',
      // ★ 시도한 예약번호는 남기지 않는다. 로그가 대입 결과 목록이 되면 안 된다.
      targetId: null,
    });

    // 실패가 쌓이면 예약번호 순회로 판정한다.
    detectCodeEnumeration({
      ipHash,
      actorId: userId,
      action: AUDIT_ACTIONS.BOOKING_LOOKUP,
    });

    return NextResponse.json({ ok: false, error: result.error }, { status: 404 });
  }

  recordAudit(request, {
    action: AUDIT_ACTIONS.BOOKING_LOOKUP,
    result: 'allow',
    actorId: userId,
    resolveActorRole: async () => (await getUser())?.role,
    targetType: 'booking',
    targetId: result.bookings[0]?.bookingCode ?? null,
  });

  return NextResponse.json({ ok: true, bookings: result.bookings });
});
