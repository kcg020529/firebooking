import { after } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { getClientIp, hashIp } from '@/lib/security/hash';
import { scanForSecrets } from '@/lib/security/leak';
import { getCurrentUser } from '@/lib/auth';

/**
 * S3 — API 전수 로깅.
 *
 * 왜 middleware.js 가 아니라 래퍼인가:
 * Next.js 미들웨어는 요청이 라우트 핸들러에 도달하기 "전"에 실행되고,
 * 핸들러가 만든 응답을 다시 볼 수 없다. 그래서 미들웨어에서는
 * status 와 duration_ms 를 알 방법이 없고, 응답 본문 유출 검사도 못 한다.
 * 핸들러를 감싸야 셋 다 정확히 기록된다.
 *
 * 대신 "감싸는 걸 깜빡하면 로그가 안 남는다"는 약점이 생긴다.
 * → docs/CONVENTIONS.md 와 PR 템플릿에서 강제한다.
 *
 * 사용법:
 *   export const GET = withApiLog(async (request) => { ... });
 */
export function withApiLog(handler) {
  return async function loggedHandler(request, context) {
    const startedAt = Date.now();

    // 로그인 여부 조회는 요청당 한 번만 하고, 핸들러와 로깅이 결과를 나눠 쓴다.
    // 핸들러가 안 쓰면 여기서도 절대 실행되지 않는다 (아래에서 after() 안으로 미룸) —
    // 골프장 목록처럼 로그인이 필요없는 API 가 이 조회 때문에 느려지던 문제가 있었다.
    let userPromise = null;
    const getUser = () => {
      if (!userPromise) userPromise = getCurrentUser().catch(() => null);
      return userPromise;
    };

    let response;
    let status;

    try {
      response = await handler(request, { ...context, getUser });
      status = response?.status ?? 200;
    } catch (error) {
      // 핸들러가 터져도 로그는 남겨야 한다. 로그가 비는 게 더 나쁘다.
      status = 500;
      recordAfterResponse({ request, status, startedAt, bodyText: null, getUser });
      throw error;
    }

    // 유출 검사를 위해 본문을 읽되, 원본 응답은 그대로 반환해야 하므로 복제한다.
    let bodyText = null;
    try {
      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('json') || contentType.includes('text')) {
        bodyText = await response.clone().text();
      }
    } catch {
      // 스트리밍 응답 등 복제할 수 없는 경우. 검사는 건너뛰고 로깅은 계속한다.
    }

    recordAfterResponse({ request, status, startedAt, bodyText, getUser });

    return response;
  };
}

/**
 * 응답을 먼저 보내고, DB 쓰기는 그 뒤에 한다.
 * 로깅 때문에 사용자 응답이 느려지면 안 된다.
 */
function recordAfterResponse({ request, status, startedAt, bodyText, getUser }) {
  const durationMs = Date.now() - startedAt;
  const url = new URL(request.url);

  const baseEntry = {
    method: request.method,
    path: url.pathname,
    status,
    duration_ms: durationMs,
    ip_hash: hashIp(getClientIp(request)),
    user_agent: request.headers.get('user-agent')?.slice(0, 300) ?? null,
  };

  const leaks = bodyText ? scanForSecrets(bodyText) : [];

  after(async () => {
    try {
      const user = await getUser();
      const entry = { ...baseEntry, actor_id: user?.id ?? null };
      const supabase = createServerClient();

      await supabase.from('api_logs').insert(entry);

      if (leaks.length > 0) {
        await supabase.from('security_events').insert({
          rule_id: 'LEAK_SECRET',
          category: 'leak',
          severity: 'critical',
          actor_id: entry.actor_id,
          ip_hash: entry.ip_hash,
          // ★ 유출된 값 자체는 절대 저장하지 않는다.
          //   탐지 로그가 두 번째 유출 경로가 되면 본말전도다.
          evidence: `${entry.method} ${entry.path} 응답에서 ${leaks.join(', ')} 패턴 검출`,
        });
      }
    } catch (error) {
      // 로깅 실패가 사용자 요청을 망가뜨리면 안 된다. 서버 콘솔에만 남긴다.
      console.error('[apiLog] 기록 실패:', error);
    }
  });
}
