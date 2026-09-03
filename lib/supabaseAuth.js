import { createBrowserClient, createServerClient } from '@supabase/ssr';

/**
 * 로그인 세션을 다루는 Supabase 클라이언트.
 *
 * lib/supabase.js 와 역할이 다르다:
 *   - lib/supabase.js  → service_role. RLS 를 우회한다. 서버 내부 작업용
 *   - 이 파일          → anon 키 + 쿠키. "지금 로그인한 사람"으로 동작하고
 *                        RLS 가 그대로 적용된다
 *
 * 세션은 쿠키에 담긴다. 브라우저와 서버가 같은 쿠키를 읽어야
 * 서버 컴포넌트에서도 로그인 상태를 알 수 있다.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function assertEnv() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      'Supabase 공개 환경변수가 없습니다. NEXT_PUBLIC_SUPABASE_URL 과 NEXT_PUBLIC_SUPABASE_ANON_KEY 를 확인하세요.'
    );
  }
}

/** 브라우저(클라이언트 컴포넌트)용. 로그인·회원가입 폼에서 쓴다. */
export function createAuthBrowserClient() {
  assertEnv();
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/**
 * 서버 컴포넌트 · Route Handler 용.
 * @param {import('next/headers').cookies} cookieStore  await cookies() 결과
 */
export function createAuthServerClient(cookieStore) {
  assertEnv();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // 서버 컴포넌트에서는 쿠키를 쓸 수 없다.
          // 토큰 갱신은 proxy.js 가 대신 처리하므로 여기서는 무시해도 된다.
        }
      },
    },
  });
}
