import { NextResponse } from 'next/server';
import { withApiLog } from '@/lib/security/apiLog';
import { getCourse } from '@/lib/courses';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/courses/:id?date=2026-09-05
 *
 * 응답: { ok: true, course: { ...course, slots: [...] } }
 * date 를 안 주면 slots 는 빈 배열이다.
 */
export const GET = withApiLog(async (request, { params }) => {
  const { id } = await params;
  const date = new URL(request.url).searchParams.get('date');

  if (date && !DATE_PATTERN.test(date)) {
    return NextResponse.json(
      { ok: false, error: '날짜 형식이 올바르지 않습니다. YYYY-MM-DD 로 보내주세요.' },
      { status: 400 }
    );
  }

  try {
    const course = await getCourse(id, { date: date ?? undefined });

    if (!course) {
      return NextResponse.json(
        { ok: false, error: '해당 골프장을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, course });
  } catch (error) {
    console.error('[GET /api/courses/:id]', error);
    return NextResponse.json(
      { ok: false, error: '골프장 정보를 불러오지 못했습니다.' },
      { status: 500 }
    );
  }
});
