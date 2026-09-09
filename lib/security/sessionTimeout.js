import { createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_TIMEOUT_COOKIE = 'firebooking-session-timeout';
export const SESSION_IDLE_TIMEOUT_SECONDS = 30 * 60;

function getSecuritySecret() {
  const secret = process.env.IP_HASH_SALT;
  if (!secret) throw new Error('IP_HASH_SALT 환경변수가 없습니다.');
  return secret;
}

function sign(payload) {
  return createHmac('sha256', getSecuritySecret())
    .update(`session-timeout:${payload}`)
    .digest('base64url');
}

export function createSessionTimeoutToken(userId, nowMs = Date.now()) {
  const issuedAt = Math.floor(nowMs / 1000);
  const payload = `${userId}.${issuedAt}`;
  return `${payload}.${sign(payload)}`;
}

export function isSessionTimeoutTokenValid(token, userId, nowMs = Date.now()) {
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
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_IDLE_TIMEOUT_SECONDS,
  };
}
