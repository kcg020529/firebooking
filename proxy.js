import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { isProtectedPagePath } from '@/lib/security/authPaths';
import {
  createSessionTimeoutToken,
  getSessionTimeoutCookieOptions,
  isSessionTimeoutTokenValid,
  SESSION_TIMEOUT_COOKIE,
} from '@/lib/security/sessionTimeout';

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
 *   1. 보호 화면의 로그인 세션 토큰 갱신 — 공개 화면은 브라우저가 표시만 담당한다
 *   2. 요청 상관 ID 부여 — 나중에 로그끼리 이어붙일 때 쓴다
 *   3. 현재 경로를 헤더로 전달 — 서버 컴포넌트는 자기 URL 을 알 수 없다
 *   4. API rate limit은 응답 로깅과 같은 lib/security/apiLog.js에서 처리
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

  const path = request.nextUrl.pathname;
  const isProtectedPage = isProtectedPagePath(path);

  // 공개 페이지의 헤더 표시는 브라우저 세션으로 처리한다.
  // 원격 토큰 검증·갱신은 보호 페이지에서만 수행하고,
  // API 권한은 각 Route Handler가 자신의 서버 경계에서 검증한다.
  if (isProtectedPage && url && anonKey) {
    // 보호된 페이지는 서버에서 사용자를 확인하고, 공개 페이지에서는 이 원격 검증을 수행하지 않습니다.
    const cookiesToSet = [];
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(nextCookies) {
          nextCookies.forEach((cookie) => {
            request.cookies.set(cookie.name, cookie.value);
            cookiesToSet.push(cookie);
          });
        },
      },
    });

    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const timeoutToken = request.cookies.get(SESSION_TIMEOUT_COOKIE)?.value;
      if (!isSessionTimeoutTokenValid(timeoutToken, user.id)) {
        // 타임아웃 정보가 없거나 만료·위조되면 로컬 세션을 무효화합니다.
        await supabase.auth.signOut({ scope: 'local' });

        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('reason', 'session_expired');
        response = NextResponse.redirect(loginUrl);
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
        response.cookies.delete(SESSION_TIMEOUT_COOKIE);
        return response;
      }

      response = NextResponse.next({ request: { headers: requestHeaders } });
      cookiesToSet.forEach(({ name, value, options }) =>
        response.cookies.set(name, value, options)
      );
      response.cookies.set(
        SESSION_TIMEOUT_COOKIE,
        createSessionTimeoutToken(user.id),
        getSessionTimeoutCookieOptions()
      );
    } else if (cookiesToSet.length > 0) {
      response = NextResponse.next({ request: { headers: requestHeaders } });
      cookiesToSet.forEach(({ name, value, options }) =>
        response.cookies.set(name, value, options)
      );
    }
  }

  return response;
}

export const config = {
  // 정적 파일과 이미지 최적화 요청은 세션 갱신이 필요 없다.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
