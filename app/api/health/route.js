import { NextResponse } from 'next/server';
import { withApiLog } from '@/lib/security/apiLog';
import { createServerClient } from '@/lib/supabase';

/**
 * 배포·DB 연결 확인용 엔드포인트.
 *
 * Day 1 게이트의 "새로고침하면 api_logs 에 행이 늘어난다"를
 * 증명하는 데 쓴다. 이 라우트를 한 번 부를 때마다 로그가 한 줄 쌓인다.
 *
 * ⚠️ 진단 정보를 응답에 담을 때는 환경변수 값을 절대 넣지 않는다.
 *    "있다/없다"만 알려준다. 값을 내려보내면 LEAK_SECRET 이 잡는다.
 */
export const GET = withApiLog(async () => {
  const checks = {
    supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabaseServiceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    anthropicKey: Boolean(process.env.ANTHROPIC_API_KEY),
    ipHashSalt: Boolean(process.env.IP_HASH_SALT),
  };

  let database = 'unknown';
  try {
    const supabase = createServerClient();
    const { error } = await supabase.from('courses').select('id').limit(1);
    database = error ? `error: ${error.message}` : 'ok';
  } catch (error) {
    database = `error: ${error.message}`;
  }

  return NextResponse.json({
    ok: true,
    env: checks,
    database,
    time: new Date().toISOString(),
  });
});
