import { createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_TIMEOUT_COOKIE = 'firebooking-session-timeout';
// 보호된 페이지에 적용하는 앱 유휴 시간 제한(30분)입니다.
export const SESSION_IDLE_TIMEOUT_SECONDS = 30 * 60;

function getSecuritySecret() {
  const secret = process.env.IP_HASH_SALT;
  if (!secret) throw new Error('IP_HASH_SALT 환경변수가 없습니다.');
  return secret;
}

function sign(payload) {
  // 사용자 ID와 발급 시각을 서명해 클라이언트가 만료 시간을 늘리거나 토큰을 다른 사용자에게 옮기지 못하게 합니다.
  return createHmac('sha256', getSecuritySecret())
    .update(`session-timeout:${payload}`)
    .digest('base64url');
}

export function createSessionTimeoutToken(userId, nowMs = Date.now()) {
  // 토큰은 짧게 유지하며, 유효한 요청이 들어올 때마다 proxy.js가 새 토큰으로 갱신합니다.
  const issuedAt = Math.floor(nowMs / 1000);
  const payload = `${userId}.${issuedAt}`;
  return `${payload}.${sign(payload)}`;
}

export function isSessionTimeoutTokenValid(token, userId, nowMs = Date.now()) {
  // 쿠키를 신뢰하기 전에 형식, 사용자 일치 여부, 시각 오차, 나이, 서명을 모두 검증합니다.
  if (typeof token !== 'string') return false;

  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [tokenUserId, issuedAtText, signature] = parts;
  if (tokenUserId !== userId || !/^\d+$/.test(issuedAtText)) return false;

  const issuedAt = Number(issuedAtText);
  const nowSeconds = Math.floor(nowMs / 1000);
  if (issuedAt > nowSeconds + 60) return false;
  if (nowSeconds - issuedAt > SESSION_IDLE_TIMEOUT_SECONDS) return false;

  const expected = sign(`${tokenUserId}.${issuedAtText}`);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function getSessionTimeoutCookieOptions() {
  // 자바스크립트에서 토큰에 접근하지 못하게 하고 같은 사이트 요청에서만 전송합니다.
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_IDLE_TIMEOUT_SECONDS,
  };
}
