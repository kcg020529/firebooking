import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * 모든 요청의 공통 처리.
 *
 * ⚠️ 여기서 api_logs 를 쓰지 않는 이유
 * proxy(구 middleware)는 요청이 라우트 핸들러에 도달하기 "전"에 실행되고, 핸들러가 만든
 * 응답을 되돌려받지 못한다. 따라서 status·duration_ms 를 알 수 없고
 * 응답 본문 유출 검사도 불가능하다.
 * → 실제 로깅은 lib/security/apiLog.js 의 withApiLog() 래퍼가 담당한다.
 *
 * proxy 가 맡는 일:
 *   1. 로그인 세션 토큰 갱신 — 안 하면 서버 컴포넌트가 만료된 토큰을 보게 된다
 *   2. 요청 상관 ID 부여 — 나중에 로그끼리 이어붙일 때 쓴다
 *   3. 현재 경로를 헤더로 전달 — 서버 컴포넌트는 자기 URL 을 알 수 없다
 *   4. Tier 1 의 rate limit (ANO_RATE) 이 들어올 자리
 */
export default async function proxy(request) {
  const requestHeaders = new Headers(request.headers);

  // 클라이언트가 보낸 값을 믿지 않는다. 항상 서버에서 새로 만든다.
  requestHeaders.set('x-request-id', crypto.randomUUID());
  requestHeaders.set('x-pathname', request.nextUrl.pathname);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  // 세션 토큰 갱신. getUser() 를 부르면 만료 임박 토큰이 재발급되고,
  // 새 쿠키가 아래 setAll 을 통해 응답에 실린다.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && anonKey) {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    await supabase.auth.getUser();
  }

  // TODO(A, Tier 1): ANO_RATE — 동일 IP 가 1분에 60회를 넘으면 429.
  //   임계값은 lib/security/rules.js 에 선언하고 여기서 가져다 쓴다.

  return response;
}

export const config = {
  // 정적 파일과 이미지 최적화 요청은 세션 갱신이 필요 없다.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
