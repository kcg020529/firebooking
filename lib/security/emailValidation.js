/** 회원가입 이메일은 공개 화면과 서버 API에서 같은 검증을 사용한다. */
const SIGNUP_EMAIL_RE = /^[^\s@]+@(?:[^\s@.]+\.)+[^\s@.]{2,}$/u;

export function normalizeSignupEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function isValidSignupEmail(value) {
  const email = normalizeSignupEmail(value);
  return email.length <= 254 && SIGNUP_EMAIL_RE.test(email);
}

