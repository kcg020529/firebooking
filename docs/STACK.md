# 사용 스택

## 애플리케이션

| 영역 | 기술 | 현재 사용 위치 |
|---|---|---|
| 웹 프레임워크 | Next.js 16.3.4 App Router | `app/`, `proxy.js` |
| UI | React 19.2.8 | 페이지와 컴포넌트 |
| 스타일 | Tailwind CSS 4, PostCSS | `app/globals.css`, `postcss.config.mjs` |
| 언어 | JavaScript (ES modules) | `type: module` |
| 런타임 | Node.js | Route Handler, 서버 보안 모듈 |

## 백엔드·데이터

| 영역 | 기술 | 용도 |
|---|---|---|
| 인증 | Supabase Auth | 이메일·비밀번호 인증, 서버 사용자 검증 |
| 인증 SSR 연동 | `@supabase/ssr` 0.12.5 | Next.js 쿠키 기반 세션 처리 |
| DB 클라이언트 | `@supabase/supabase-js` 2.112.4 | Postgres, RPC, 감사·보안 이벤트 저장 |
| 데이터베이스 | Supabase PostgreSQL | 예약, 사용자 프로필, 로그, 로그인 제한 상태 |
| 접근 제어 | PostgreSQL RLS + 서버 권한 검사 | 사용자 본인 데이터와 관리자 데이터 분리 |

## AI·보안

| 영역 | 기술/모듈 | 용도 |
|---|---|---|
| LLM | DeepSeek API (`lib/ai/deepseek.js`) | 챗봇 응답과 예약 tool call |
| 입력 보안 | `lib/security/chatGuard.js`, `injection.js` | 역할 위조·프롬프트 인젝션 차단 |
| 개인정보 보호 | `lib/security/pii.js` | 전화번호·주민번호·카드·이메일·이름 탐지·마스킹 |
| 출력 보안 | `outputGuard.js`, `apiResponseGuard.js` | LLM 및 API 응답의 비밀·PII 차단 |
| 관찰성 | `apiLog.js`, `audit.js`, `rules.js` | API 로그, 감사 로그, 이상 이벤트 |
| 배포 | Vercel | Next.js 애플리케이션 배포 |

## 운영 원칙

- `NEXT_PUBLIC_*` 값은 브라우저에 노출될 수 있으므로 공개 가능한 Supabase URL·anon key만 둔다.
- `SUPABASE_SERVICE_ROLE_KEY`, `DEEPSEEK_API_KEY`, `IP_HASH_SALT`는 서버 전용이며 `.env.local`과 Vercel 환경변수에만 둔다.
- 의존성 버전과 `package-lock.json`을 함께 관리한다.

