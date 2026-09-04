import { NextResponse } from 'next/server';
import { withApiLog } from '@/lib/security/apiLog';
import { getSlot } from '@/lib/courses';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/slots/:slotId
 *
 * 슬롯 단건 상세와 해당 골프장 요약을 반환한다.
 * 성공: { ok: true, slot: { ...slot, course }, course }
 * 실패: { ok: false, error: '한국어 메시지' }
 */
export const GET = withApiLog(async (request, { params }) => {
  const { slotId } = await params;

  if (!slotId || typeof slotId !== 'string' || !UUID_PATTERN.test(slotId)) {
    return NextResponse.json(
      { ok: false, error: '유효하지 않은 슬롯 ID입니다.' },
      { status: 400 }
    );
  }

  try {
    const slot = await getSlot(slotId);

    if (!slot) {
      return NextResponse.json(
        { ok: false, error: '선택하신 시간을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      slot,
      course: slot.course,
    });
  } catch (error) {
    console.error('[GET /api/slots/:slotId]', error);
    return NextResponse.json(
      { ok: false, error: '슬롯 정보를 불러오지 못했습니다.' },
      { status: 500 }
    );
  }
});
