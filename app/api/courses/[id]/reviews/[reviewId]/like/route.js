import { NextResponse } from 'next/server';
import { withApiLog } from '@/lib/security/apiLog';
import { getAuthUser } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';

export const POST = withApiLog(async (request, { params }) => {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ ok: false, error: '로그인이 필요합니다.' }, { status: 401 });
  const { reviewId } = await params;
  const { data, error } = await createServerClient().rpc('toggle_course_review_like', {
    p_review_id: reviewId,
    p_user_id: user.id,
  });
  if (error) {
    console.error('[review like]', error);
    return NextResponse.json({ ok: false, error: '좋아요를 처리하지 못했습니다.' }, { status: 500 });
  }
  const result = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ ok: true, liked: result?.liked ?? false, likeCount: result?.like_count ?? 0 });
});
