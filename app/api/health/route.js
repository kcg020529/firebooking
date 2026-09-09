import { NextResponse } from 'next/server';
import { withApiLog } from '@/lib/security/apiLog';
import { createServerClient } from '@/lib/supabase';

/**
 * 배포·DB 연결 확인용 엔드포인트.
 *
 * Day 1 게이트의 "새로고침하면 api_logs 에 행이 늘어난다"를
 * 증명하는 데 쓴다. 이 라우트를 한 번 부를 때마다 로그가 한 줄 쌓인다.
 *
 * 운영 응답에는 환경변수 구성이나 DB 오류 원문을 넣지 않는다.
 * 외부에는 연결 가능 여부만 공개하고 상세 원인은 서버 로그에서 확인한다.
 */
export const GET = withApiLog(async () => {
  let database = 'unavailable';
  try {
    const supabase = createServerClient();
    const { error } = await supabase.from('courses').select('id').limit(1);
    database = error ? 'unavailable' : 'ok';
  } catch {
    database = 'unavailable';
  }

  return NextResponse.json({
    ok: database === 'ok',
    database,
    time: new Date().toISOString(),
  }, { status: database === 'ok' ? 200 : 503 });
});
