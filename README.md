# firebooking

골프장 검색·예약 기능과 로그 기반 보안 탐지·대응 기능을 결합한 3인 팀 프로젝트입니다.

- 배포: [https://firebooking-chi.vercel.app](https://firebooking-chi.vercel.app)
- 프레임워크: Next.js App Router
- 데이터베이스·인증: Supabase PostgreSQL, Auth, RLS
- 챗봇: DeepSeek API tool calling
- 배포: Vercel

> 이 저장소는 공개 저장소입니다. `.env.local`, Supabase `service_role` 키, DeepSeek API 키, Webhook URL 등 비밀값은 절대 커밋하지 않습니다.

## 프로젝트 개요

사용자는 필드골프·스크린골프장을 검색하고, 날짜와 시간대를 선택해 예약할 수 있습니다. 같은 예약 로직을 일반 예약 폼과 LLM 챗봇이 공유하며, 예약·조회·관리자 접근 과정에서 발생하는 로그를 이용해 개인정보 노출, 프롬프트 인젝션, 반복 공격, 권한 위반 등을 탐지합니다.

핵심 구조는 다음과 같습니다.

```text
브라우저
  ├─ 일반 예약 폼 ─┐
  └─ LLM 챗봇 ────┴─> 예약 API ─> lib/bookings.js ─> Supabase
                              └─> API·감사·보안 이벤트 로그

staff/admin
  └─ 관리자 대시보드 ─> 메트릭·보안 이벤트·감사 로그·대응 기능
```

## 주요 기능

### 예약

- 필드골프·스크린골프장 목록 및 상세 조회
- 날짜별 예약 슬롯, 잔여 인원, 시간대별 가격 표시
- 로그인 사용자만 예약 생성 가능
- 일반 폼과 챗봇이 `lib/bookings.js`의 동일한 예약 로직 사용
- 동일 슬롯·전화번호 중복 예약 방지
- 전화번호당 미래 예약 수 제한 및 IP 기반 슬롯 고갈 방어
- `/my`에서 본인 예약 조회 및 취소
- 예약 취소 시 슬롯 잔여 인원 즉시 복구
- 2026년 9월 30일까지의 데모 슬롯 제공

### 챗봇

- 골프장·날짜·시간·인원 조건으로 예약 가능 슬롯 검색
- 대화에서 이미 받은 예약 조건 유지
- 예약 내용을 한 번 확인한 뒤 명시적 동의가 있을 때만 예약 생성
- `네`, `진행해줘`, `ㄱㄱ`, `고고`, `예약해줘` 등의 확인 표현 지원
- 비로그인 사용자는 검색·안내만 가능하며 예약 시 로그인 안내
- tool 결과에 없는 슬롯·예약 정보 생성 방지

### 리뷰

- 골프장 예약 이력이 있는 로그인 사용자만 리뷰 작성 가능
- 평점·난이도·후기 등록, 수정, 삭제
- 리뷰 좋아요 및 요약 정보 제공
- 리뷰 내용의 개인정보 탐지·마스킹

### 인증·보안

- Supabase Auth 기반 회원가입·로그인
- `user`, `staff`, `admin` 역할과 RLS 기반 접근 제어
- 로그인·회원가입 Cloudflare Turnstile CAPTCHA 연동
- 반복 로그인 실패 잠금 및 남은 잠금 시간 안내
- 보호 페이지 30분 비활동 세션 만료
- API 요청·응답 로깅, 감사 로그, 보안 이벤트 기록
- 전화번호·이메일·이름 등 개인정보 탐지와 로그 마스킹
- 프롬프트 인젝션·SQL/XSS 패턴 사전 차단
- 예약번호 열거, 조회 무차별 대입, 관리자 경로 탐색, 과도한 요청 탐지
- critical 이벤트 Discord 알림
- critical 사고 IP 암호화 보관 및 관리자 사유 기반 조회
- 앱 차단 목록 및 Cloudflare IP 차단·해제 연동
- CSP Report-Only를 포함한 웹 보안 응답 헤더

### 관리자 화면

| 경로 | 기능 | 접근 권한 |
|---|---|---|
| `/admin` | API·보안 메트릭 | staff, admin |
| `/admin/security` | 보안 이벤트 조회 및 대응 | staff, admin |
| `/admin/audit` | 감사 로그 검색 | staff, admin |

IP 복호화, IP 차단·해제, 로그인 잠금 해제 등 대응 작업은 기능별로 관리자 권한을 다시 확인하고 감사 로그를 남깁니다.

## 기술 스택

| 영역 | 기술 |
|---|---|
| 애플리케이션 | Next.js 16.3.4, React 19.2.8, JavaScript ES modules |
| UI | Tailwind CSS 4, PostCSS |
| 인증·DB | Supabase Auth, PostgreSQL, RLS, `@supabase/ssr` |
| LLM | DeepSeek API `deepseek-v4-flash`, tool calling |
| 배포 | Vercel |
| 테스트 | Node.js test runner |
| 보안 연동 | Cloudflare Turnstile·Firewall, Discord Webhook |

## 팀

| 구분 | 이름 | GitHub | 담당 |
|---|---|---|---|
| A | 김찬규 | [@kcg020529](https://github.com/kcg020529) | 인증, 권한, 감사 로그, 백엔드, 이상 탐지 |
| B | 김기승 | [@maybe2dream-create](https://github.com/maybe2dream-create) | 프론트엔드, 관리자·보안 대시보드, 모니터링 |
| C | 이동훈 | [@DongHoon-L](https://github.com/DongHoon-L) | 챗봇, LLM 보안, 개인정보 탐지·마스킹 |

## 로컬 실행

### 1. 저장소와 의존성 준비

```bash
git clone git@github.com:kcg020529/firebooking.git
cd firebooking
npm install
```

Node.js 20 이상 사용을 권장합니다.

### 2. 환경변수 설정

`.env.example`을 `.env.local`로 복사한 뒤 실제 값을 입력합니다.

```bash
cp .env.example .env.local
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

| 변수 | 필수 여부 | 용도 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | 필수 | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 필수 | 브라우저·Auth용 공개 anon 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | 필수 | 서버 전용 DB 접근 키 |
| `DEEPSEEK_API_KEY` | 챗봇 사용 시 필수 | DeepSeek 서버 호출 |
| `IP_HASH_SALT` | 필수 | IP·로그인 식별자 가명화와 세션 서명 |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | 선택 | Turnstile 공개 사이트 키 |
| `DISCORD_SECURITY_WEBHOOK_URL` | 선택 | critical 이벤트 알림 |
| `SECURITY_IP_ENCRYPTION_KEY` | 보안 대응 기능 사용 시 필수 | critical 사고 IP AES-256-GCM 암호화 |
| `CLOUDFLARE_ORIGIN_SECRET` | 선택 | 신뢰 가능한 Cloudflare 원본 요청 확인 |
| `CLOUDFLARE_API_TOKEN` | IP 차단 연동 시 필수 | Cloudflare Firewall API 호출 |
| `CLOUDFLARE_ZONE_ID` | IP 차단 연동 시 필수 | Cloudflare 대상 Zone |

`NEXT_PUBLIC_` 접두사가 없는 값은 서버 전용입니다. 클라이언트 컴포넌트에서 읽거나 응답에 포함하면 안 됩니다.

### 3. Supabase 구성

새 Supabase 프로젝트의 SQL Editor에서 아래 파일을 순서대로 적용합니다.

1. `supabase/schema.sql` — 테이블, 함수, 트리거
2. `supabase/policies.sql` — 권한, RLS 정책, 함수 실행 권한
3. `supabase/seed.sql` — 데모 골프장과 기본 슬롯
4. `supabase/migrations/` — 파일명 시간순으로 추가 변경 적용

마이그레이션에는 리뷰·좋아요, 로그인 시도 제한, 9월 말까지의 슬롯, 가격·정원 다양화, 로그인 필수 예약, 예약 취소, 사고 대응 기능이 포함됩니다.

`staff` 또는 `admin` 계정이 필요하면 회원가입 후 SQL Editor에서 해당 프로필 역할을 승격합니다.

```sql
update public.profiles
set role = 'admin'
where email = 'admin@example.com';
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다. `/api/health`에서는 비밀값 자체가 아닌 필수 환경변수의 설정 여부만 확인할 수 있습니다.

## 검증 명령

```bash
npm test
npm run lint
npm run build
```

기능 변경 후에는 최소한 관련 테스트와 lint를 실행하고, 배포 전에는 전체 테스트와 production build를 확인합니다.

## 주요 디렉터리

```text
app/                    페이지와 Route Handler
components/             공통 UI와 챗봇·예약 컴포넌트
lib/bookings.js         폼·챗봇이 공유하는 예약 도메인 로직
lib/ai/                 DeepSeek 연동, 시스템 프롬프트, tool 실행
lib/security/           로깅, 탐지, 마스킹, 권한, 사고 대응
supabase/               스키마, RLS 정책, 시드, 마이그레이션
test/                   단위·보안·회귀 테스트
docs/                   설계, 운영, 보안 검증 문서
```

## 문서

| 문서 | 내용 |
|---|---|
| [아키텍처](docs/ARCHITECTURE.md) | 애플리케이션 구성과 보안 경계 |
| [데이터 흐름](docs/DATA_FLOW.md) | 예약·챗봇·로그인·관리자 데이터 흐름 |
| [보안 설계](docs/SECURITY.md) | 개인정보, 인젝션, 이상 탐지, 권한·감사 설계 |
| [탐지 운영 가이드](docs/DETECTION_OPERATIONS_GUIDE.md) | 탐지 결과 확인과 운영 대응 절차 |
| [탐지 QA](docs/DETECTION_QA.md) | 오탐·미탐 검증 기준과 결과 |
| [LLM 보안 테스트](docs/LLM_SECURITY_TESTS.md) | 챗봇 보안 테스트 시나리오 |
| [멘토 피드백 보완](docs/MENTOR_FEEDBACK_REMEDIATION.md) | 지적 사항, 개선 내용, 검증 결과 |
| [DeepSeek 설정](docs/DEEPSEEK_SETUP.md) | API 키와 챗봇 연동 검증 방법 |
| [웹 보안 헤더](docs/WEB_SECURITY_HEADERS.md) | CSP와 응답 보안 헤더 운영 방법 |
| [협업 규칙](docs/CONVENTIONS.md) | 브랜치, 커밋, PR, 코드 스타일 |
| [기술 스택](docs/STACK.md) | 사용 기술과 비밀값 관리 원칙 |
| [결정 기록](docs/DECISIONS.md) | 주요 기술·운영 결정 |
| [SBOM](docs/SBOM.md) | 의존성 명세 생성·갱신 방법 |

## 현재 데모 기준

- 예약 슬롯은 자동 생성 방식이 아니라 마이그레이션으로 만든 고정 데모 데이터입니다.
- 현재 데모 예약 가능 범위는 2026년 9월 30일까지입니다.
- 예약은 로그인 사용자만 가능하며 기존 비로그인 예약 데이터는 로그인 필수 전환 마이그레이션에서 초기화됩니다.
- `.env.local`과 Vercel Environment Variables는 별도로 관리하므로 배포 환경에도 같은 항목을 등록해야 합니다.
