import { getSlot as defaultGetSlot } from './courses.js';
import { isValidSlotId } from './slotId.js';

/**
 * 슬롯 단건 조회 핸들러 팩토리 (테스트 시 의존성 주입용).
 *
 * 라우트 파일(app/api/slots/[slotId]/route.js)이 아니라 여기에 두는 이유:
 * 라우트 파일은 '@/lib/security/apiLog' 를 정적 import 하는데,
 * node --test 는 jsconfig 의 '@/' 별칭을 해석하지 못한다.
 * 핸들러를 lib 으로 빼면 테스트가 라우트 파일을 건드리지 않고 핸들러만 가져올 수 있고,
 * 라우트는 withApiLog 를 조건 없이 정적으로 감쌀 수 있다.
 *
 * @param {{ getSlotFn?: typeof defaultGetSlot }} [options]
 */
export function createGetSlotHandler({ getSlotFn = defaultGetSlot } = {}) {
  return async function handleGetSlot(request, { params }) {
    const resolvedParams = await params;
    const slotId = resolvedParams?.slotId;

    if (!isValidSlotId(slotId)) {
      return Response.json(
        { ok: false, error: '유효하지 않은 슬롯 ID입니다.' },
        { status: 400 }
      );
    }

    try {
      const slot = await getSlotFn(slotId);

      if (!slot) {
        return Response.json(
          { ok: false, error: '선택하신 시간을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      return Response.json({
        ok: true,
        slot,
        course: slot.course,
      });
    } catch (error) {
      console.error('[GET /api/slots/:slotId]', error);
      return Response.json(
        { ok: false, error: '슬롯 정보를 불러오지 못했습니다.' },
        { status: 500 }
      );
    }
  };
}

export const handleGetSlot = createGetSlotHandler();
