/** @type {import('next').NextConfig} */

/**
 * 응답 보안 헤더.
 *
 * 2026-09-08 자체 코드 감사에서 "보안 헤더 전무"로 잡힌 항목이다.
 * 탐지 규칙과 달리 이건 브라우저가 대신 막아주는 방어선이라, 코드 한 곳에서 끝난다.
 *
 * CSP 는 이번에 enforce 하지 않는다 — `Content-Security-Policy-Report-Only` 로만 붙인다.
 * 지금 바로 강제하면 Turnstile 위젯·Supabase 호출처럼 정상 요청이 끊길 수 있어서,
 * 위반 보고를 먼저 보고 범위를 좁힌 뒤 별도 작업에서 enforce 로 바꾼다.
 */
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https:;
  font-src 'self' data:;
  connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com;
  frame-src 'self' https://challenges.cloudflare.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  object-src 'none'
`
  .replace(/\s+/g, ' ')
  .trim();

const securityHeaders = [
  // 다른 사이트가 우리 화면을 iframe 으로 감싸 클릭을 가로채는 것을 막는다.
  { key: 'X-Frame-Options', value: 'DENY' },

  // 브라우저가 Content-Type 을 무시하고 내용을 추측해 실행하는 것을 막는다.
  { key: 'X-Content-Type-Options', value: 'nosniff' },

  // 외부로 나갈 때 경로를 넘기지 않는다. 예약 조회 URL 에는 예약번호가 들어갈 수 있다.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

  // 예약 사이트에 필요 없는 장치 권한을 전부 끈다.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },

  // HTTPS 로만 접속하게 강제한다. Vercel 배포본은 이미 전 구간 HTTPS 다.
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },

  { key: 'X-DNS-Prefetch-Control', value: 'off' },

  // 관찰 전용. 위반 로그를 보고 나서 enforce 로 바꾼다.
  { key: 'Content-Security-Policy-Report-Only', value: cspHeader },
];

const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
