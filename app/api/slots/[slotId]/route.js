import { NextResponse } from 'next/server.js';
import { getSlot as defaultGetSlot } from '../../../../lib/courses.js';
import { isValidSlotId } from '../../../../lib/slotId.js';

/**
 * 슬롯 단건 조회 핸들러 팩토리 (테스트 시 의존성 주입용).
 *
 * @param {{ getSlotFn?: typeof defaultGetSlot }} [options]
 */
export function createGetSlotHandler({ getSlotFn = defaultGetSlot } = {}) {
  return async function handleGetSlot(request, { params }) {
    const resolvedParams = await params;
    const slotId = resolvedParams?.slotId;

    if (!isValidSlotId(slotId)) {
      return NextResponse.json(
        { ok: false, error: '유효하지 않은 슬롯 ID입니다.' },
        { status: 400 }
      );
    }

    try {
      const slot = await getSlotFn(slotId);

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
  };
}

export const handleGetSlot = createGetSlotHandler();

let withApiLog = (handler) => handler;
try {
  const mod = await import('@/lib/security/apiLog');
  withApiLog = mod.withApiLog;
} catch {
  // Node.js test runner 환경에서는 withApiLog 외부 의존성 폴백
}

/**
 * GET /api/slots/:slotId
 *
 * 프로덕션에서는 withApiLog 로 감사 및 API 로깅을 수행한다.
 */
export const GET = withApiLog(handleGetSlot);
