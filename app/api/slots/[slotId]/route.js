import { withApiLog } from '@/lib/security/apiLog';
import { handleGetSlot } from '@/lib/slotHandler';

/**
 * GET /api/slots/:slotId
 *
 * 핸들러 본체는 lib/slotHandler.js — 테스트가 라우트 파일을 import 하지 않도록 분리했다.
 */
export const GET = withApiLog(handleGetSlot);
