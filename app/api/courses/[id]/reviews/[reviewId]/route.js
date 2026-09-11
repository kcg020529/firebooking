import { NextResponse } from 'next/server';
import { withApiLog } from '@/lib/security/apiLog';
import { getAuthUser } from '@/lib/auth';
import { recordAudit, AUDIT_ACTIONS } from '@/lib/security/audit';
import { updateCourseReview, deleteCourseReview } from '@/lib/reviews';

function errorResponse(error, status = 400) { return NextResponse.json({ ok: false, error }, { status }); }

export const PATCH = withApiLog(async (request, { params }) => {
  const user = await getAuthUser();
  if (!user) return errorResponse('로그인이 필요합니다.', 401);
  const { id, reviewId } = await params;
  let body;
  try { body = await request.json(); } catch { return errorResponse('요청 형식이 올바르지 않습니다.'); }
  try {
    const result = await updateCourseReview({ ...body, courseId: id, reviewId, userId: user.id });
    recordAudit(request, { action: AUDIT_ACTIONS.REVIEW_UPDATE, result: result.ok ? 'allow' : 'deny', actorId: user.id, targetType: 'course_review', targetId: reviewId });
    return result.ok ? NextResponse.json(result) : errorResponse(result.error, 403);
  } catch (error) { console.error('[PATCH review]', error); return errorResponse('리뷰를 수정하지 못했습니다.', 500); }
});

export const DELETE = withApiLog(async (request, { params }) => {
  const user = await getAuthUser();
  if (!user) return errorResponse('로그인이 필요합니다.', 401);
  const { id, reviewId } = await params;
  try {
    const result = await deleteCourseReview(id, reviewId, user.id);
    recordAudit(request, { action: AUDIT_ACTIONS.REVIEW_DELETE, result: result.ok ? 'allow' : 'deny', actorId: user.id, targetType: 'course_review', targetId: reviewId });
    return result.ok ? NextResponse.json(result) : errorResponse(result.error, 403);
  } catch (error) { console.error('[DELETE review]', error); return errorResponse('리뷰를 삭제하지 못했습니다.', 500); }
});
