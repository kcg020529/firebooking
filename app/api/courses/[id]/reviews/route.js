import { NextResponse } from 'next/server';
import { withApiLog } from '@/lib/security/apiLog';
import { getAuthUser } from '@/lib/auth';
import { recordAudit, AUDIT_ACTIONS } from '@/lib/security/audit';
import {
  canReviewCourse,
  createCourseReview,
  listCourseReviews,
  getFeaturedReviews,
  paginateReviews,
  hasUserReviewedCourse,
} from '@/lib/reviews';

function jsonError(error, status) {
  return NextResponse.json({ ok: false, error }, { status });
}

export const GET = withApiLog(async (request, { params }) => {
  const { id } = await params;

  try {
    const user = await getAuthUser();
    const result = await listCourseReviews(id, { viewerId: user?.id ?? null });
    const canReview = user
      ? (await canReviewCourse(id, user.id)) && !(await hasUserReviewedCourse(id, user.id))
      : false;
    const page = Number(new URL(request.url).searchParams.get('page') ?? 1);
    const featured = getFeaturedReviews(result.reviews);
    const rest = result.reviews;
    return NextResponse.json({ ok: true, summary: result.summary, featured, ...paginateReviews(rest, page), canReview });
  } catch (error) {
    console.error('[GET /api/courses/:id/reviews]', error);
    return jsonError('리뷰를 불러오지 못했습니다.', 500);
  }
});

export const POST = withApiLog(async (request, { params }) => {
  const { id } = await params;
  const user = await getAuthUser();

  if (!user) return jsonError('로그인이 필요합니다.', 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('요청 형식이 올바르지 않습니다.', 400);
  }

  try {
    const result = await createCourseReview(
      // 골프장과 작성자 식별자는 요청 본문이 아니라 URL·검증된 세션에서 결정한다.
      { ...body, courseId: id, userId: user.id },
    );

    if (!result.ok) {
      const status = result.error.includes('예약한 사용자') ? 403 : 400;
      recordAudit(request, {
        action: AUDIT_ACTIONS.REVIEW_CREATE,
        result: 'deny',
        actorId: user.id,
        targetType: 'course_review',
        targetId: id,
      });
      return jsonError(result.error, status);
    }

    recordAudit(request, {
      action: AUDIT_ACTIONS.REVIEW_CREATE,
      result: 'allow',
      actorId: user.id,
      targetType: 'course_review',
      targetId: id,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('[POST /api/courses/:id/reviews]', error);
    return jsonError('리뷰를 저장하지 못했습니다.', 500);
  }
});
