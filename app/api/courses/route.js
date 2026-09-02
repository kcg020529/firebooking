import { NextResponse } from 'next/server';
import { withApiLog } from '@/lib/security/apiLog';
import { listCourses } from '@/lib/courses';

const VALID_TYPES = ['field', 'screen'];

/**
 * GET /api/courses?type=field
 *
 * 응답: { ok: true, courses: [...] }
 * 에러: { ok: false, error: '한국어 메시지' }
 */
export const GET = withApiLog(async (request) => {
  const type = new URL(request.url).searchParams.get('type');

  if (type && !VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { ok: false, error: '골프장 종류는 field 또는 screen 만 가능합니다.' },
      { status: 400 }
    );
  }

  try {
    const courses = await listCourses({ type: type ?? undefined });
    return NextResponse.json({ ok: true, courses });
  } catch (error) {
    // 원본 에러 메시지에는 DB 구조·연결 정보가 섞일 수 있으므로 그대로 내보내지 않는다.
    console.error('[GET /api/courses]', error);
    return NextResponse.json(
      { ok: false, error: '골프장 목록을 불러오지 못했습니다.' },
      { status: 500 }
    );
  }
});
