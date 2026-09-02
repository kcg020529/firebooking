import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * 서버 전용 클라이언트.
 *
 * ⚠️ service_role 키는 RLS 를 완전히 우회한다.
 *    - 클라이언트 컴포넌트('use client')에서 절대 import 하지 말 것
 *    - 이 파일을 import 하는 코드는 전부 서버(Route Handler, Server Component)여야 한다
 *    - 우회 권한을 쓰는 대신, 검증·감사·마스킹 책임을 서버가 진다
 */
export function createServerClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !key) {
    throw new Error(
      'Supabase 서버 환경변수가 없습니다. .env.local 의 NEXT_PUBLIC_SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 를 확인하세요.'
    );
  }

  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * 브라우저용 클라이언트. anon(publishable) 키를 쓰므로 RLS 가 그대로 적용된다.
 * courses · slots 만 읽힌다. 나머지는 DB 가 거절한다.
 */
export function createBrowserClient() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !key) {
    throw new Error(
      'Supabase 공개 환경변수가 없습니다. NEXT_PUBLIC_SUPABASE_URL 과 NEXT_PUBLIC_SUPABASE_ANON_KEY 를 확인하세요.'
    );
  }

  return createClient(SUPABASE_URL, key);
}
