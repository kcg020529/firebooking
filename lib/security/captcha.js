/**
 * CAPTCHA(Cloudflare Turnstile) 공용 규칙.
 *
 * 토큰 검증은 Supabase Auth 가 직접 한다 — Dashboard 에서 CAPTCHA 를 켜면
 * 가입·로그인 요청마다 captchaToken 을 요구한다. 그래서 우리 /api/auth/login 을
 * 거치지 않고 공개 Supabase Auth URL 을 직접 호출하는 자동화도 같이 막힌다.
 * 이 모듈은 토큰을 안전하게 넘기고, 실패 응답을 알아보는 일만 한다.
 *
 * 브라우저(가입 화면)와 서버(로그인 라우트)가 함께 쓰므로 node 전용 모듈을 import 하지 않는다.
 */

/** Turnstile 토큰은 2048자를 넘지 않는다. 그 이상은 조작된 입력으로 보고 버린다. */
export const CAPTCHA_TOKEN_MAX_LENGTH = 2048;

export const CAPTCHA_REQUIRED_MESSAGE = '보안 확인을 완료해 주세요.';
export const CAPTCHA_FAILED_MESSAGE = '보안 확인에 실패했습니다. 다시 시도해 주세요.';

/** 요청 본문의 토큰을 문자열로 정리한다. 형식이 맞지 않으면 null. */
export function normalizeCaptchaToken(value) {
  if (typeof value !== 'string') return null;
  const token = value.trim();
  if (!token || token.length > CAPTCHA_TOKEN_MAX_LENGTH) return null;
  return token;
}

/** Supabase Auth 가 CAPTCHA 토큰을 거절했는지. 비밀번호 실패와 구분해야 잠금 횟수에 섞이지 않는다. */
export function isCaptchaFailure(error) {
  return error?.code === 'captcha_failed';
}
