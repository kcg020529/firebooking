# 응답 보안 헤더

적용 위치: `next.config.mjs` 한 곳. 모든 경로(`/:path*`)에 붙는다.

## 왜 넣었나

2026-09-08 자체 코드 감사에서 `next.config.mjs`가 빈 객체라 응답에 보안 헤더가 하나도 없는 것을 확인했다.
탐지 규칙(`lib/security/`)은 우리 서버가 기록·차단하는 방어선이고, 이 헤더들은 브라우저가 대신 막아주는 방어선이다.
둘은 겹치지 않는다 — 예를 들어 클릭재킹이나 MIME 스니핑은 서버 로그로는 보이지 않는다.

## 적용한 헤더

| 헤더 | 값 | 막는 것 |
|---|---|---|
| `X-Frame-Options` | `DENY` | 클릭재킹. 다른 사이트가 우리 화면을 iframe 으로 감싸 클릭을 가로채는 공격 |
| `X-Content-Type-Options` | `nosniff` | MIME 스니핑. 업로드·응답 내용을 브라우저가 스크립트로 추측 실행하는 것 |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | 외부 이동 시 경로 유출. 예약 조회 URL 에는 예약번호가 들어갈 수 있다 |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), interest-cohort=()` | 예약 사이트에 필요 없는 장치 권한 요청 |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | HTTP 로의 강등. 2년간 HTTPS 강제 |
| `X-DNS-Prefetch-Control` | `off` | 페이지 안 링크의 사전 DNS 조회로 생기는 정보 노출 |
| `Content-Security-Policy-Report-Only` | 아래 참고 | 스크립트·프레임 출처 제한 (이번에는 **관찰만**) |

## CSP 를 관찰 모드로 둔 이유

`Content-Security-Policy` 로 바로 강제하면 정상 요청이 끊긴다. 지금 사이트가 쓰는 외부 출처는 두 가지다.

- Cloudflare Turnstile — 로그인·가입 CAPTCHA. `challenges.cloudflare.com` 에서 스크립트와 iframe 을 받는다
- Supabase — 인증·데이터 API. `*.supabase.co` 로 요청한다

두 출처를 `script-src`·`frame-src`·`connect-src` 에 넣어뒀지만, 실제 배포에서 빠진 출처가 더 있을 수 있다.
그래서 `Report-Only` 로 먼저 붙이고, 위반 보고를 확인한 뒤 `Content-Security-Policy` 로 바꾼다.

현재 정책:

```
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
```

`script-src` 에 `'unsafe-inline'`·`'unsafe-eval'` 이 남아 있는 것은 Next.js 가 내보내는 인라인 부트스트랩 스크립트 때문이다.
nonce 방식으로 좁히려면 미들웨어에서 요청마다 nonce 를 발급해야 하므로 이번 범위 밖으로 둔다.

## 확인 방법

배포 후 응답 헤더를 직접 본다.

```powershell
curl.exe -sI https://<배포주소>/ | Select-String "x-frame-options|x-content-type-options|referrer-policy|permissions-policy|strict-transport-security|content-security-policy-report-only"
```

브라우저에서는 F12 → Network → 문서 요청 → Response Headers 에서 같은 값을 볼 수 있다.
CSP 위반이 있으면 Console 에 `[Report Only]` 로 표시된다.

## 남은 작업

- `Report-Only` 에서 나온 위반 목록 확인
- 위반이 없으면 `Content-Security-Policy` 로 전환
- 전환 시 `script-src` 의 `'unsafe-inline'`·`'unsafe-eval'` 축소 검토
