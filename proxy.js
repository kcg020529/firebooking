import { NextResponse } from 'next/server';

/**
 * /api/* 요청 공통 처리.
 *
 * ⚠️ 여기서 api_logs 를 쓰지 않는 이유
 * proxy(구 middleware)는 요청이 라우트 핸들러에 도달하기 "전"에 실행되고, 핸들러가 만든
 * 응답을 되돌려받지 못한다. 따라서 status·duration_ms 를 알 수 없고
 * 응답 본문 유출 검사도 불가능하다.
 * → 실제 로깅은 lib/security/apiLog.js 의 withApiLog() 래퍼가 담당한다.
 *
 * proxy 가 맡는 일:
 *   1. 요청 상관 ID 부여 — 나중에 로그끼리 이어붙일 때 쓴다
 *   2. Tier 1 의 rate limit (ANO_RATE) 이 들어올 자리
 */
export default function proxy(request) {
  const requestHeaders = new Headers(request.headers);

  // 클라이언트가 보낸 값을 믿지 않는다. 항상 서버에서 새로 만든다.
  requestHeaders.set('x-request-id', crypto.randomUUID());

  // TODO(A, Tier 1): ANO_RATE — 동일 IP 가 1분에 60회를 넘으면 429.
  //   임계값은 lib/security/rules.js 에 선언하고 여기서 가져다 쓴다.

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: '/api/:path*',
};
