# firebooking

골프 예약 사이트 + 로그 보안 서비스. 보안 수업 3인 팀 프로젝트.

필드골프·스크린골프 예약 사이트를 만들고, **그 사이트가 뿜어내는 로그로 PII 마스킹 · 프롬프트 인젝션 탐지 · API 모니터링 · 접근 감사를 구현한다.**
예약 기능은 그릇이고, 평가 대상은 보안 역량이다. 비중 반반.

---

## 무엇을 만드는가

예약 입구가 **두 개**다.

1. **수동 폼** — 이름·전화·날짜·인원을 키보드로 직접 입력
2. **LLM 챗봇** — 우하단 위젯에서 대화로 예약. 버튼(퀵리플라이)만 눌러서도 완료

두 입구 모두 `lib/bookings.js`의 `createBooking()` 하나를 통과한다. 이 단일 진입점이 프로젝트 구조의 핵심이다.

그리고 그 위에 보안 4축이 얹힌다.

| 축 | 내용 | 담당 |
|---|---|---|
| **S1** | PII 탐지 · 마스킹 (챗봇 로그) | C |
| **S2** | 프롬프트 인젝션 · 이상 탐지 | C + A |
| **S3** | API 전수 로깅 · 모니터링 · 알림 | A + B |
| **S4** | 인증 · 권한 · 감사 로그 | A |

상세: [docs/SECURITY.md](docs/SECURITY.md)

---

## 기술 스택

| 항목 | 선택 | 이유 |
|---|---|---|
| 프레임워크 | Next.js (App Router), JavaScript | `middleware.js`로 전수 로깅이 공짜 |
| 인증 | Supabase Auth + RLS | 권한을 DB 레벨에서 강제 |
| DB | Supabase (Postgres) | 무료. 로그 테이블 조회를 대시보드에서 그대로 |
| 배포 | Vercel | push하면 자동 배포. LLM 키를 서버에 숨기는 유일한 방법 |
| LLM | Claude API `claude-haiku-4-5-20251001` | 싸고 빠르고 tool use 지원 |
| 스타일 | Tailwind CSS | 별도 CSS 파일 관리 없음 |

> **왜 GitHub Pages가 아닌가**
> GitHub Pages는 정적 파일만 서빙한다. LLM API 키를 브라우저 코드에 넣으면 누구나 개발자도구에서 꺼내 간다.
> 키는 반드시 서버에 있어야 한다. GitHub에서 협업하는 방식은 그대로고, 배포되는 곳만 Vercel이다.

---

## 팀 · 역할

| | 이름 | GitHub | 담당 | 중점 보안 역량 |
|---|---|---|---|---|
| **A** | *(TODO)* | [@kcg020529](https://github.com/kcg020529) | 인증 · 감사 · 백엔드 | 감사 로그 설계, 이상 탐지 기준 수립 |
| **B** | *(TODO)* | [@maybe2dream-create](https://github.com/maybe2dream-create) | 프론트 · 보안 대시보드 | 모니터링 대시보드, 알림 체계, 리포트 |
| **C** | *(TODO)* | [@DongHoon-L](https://github.com/DongHoon-L) | 챗봇 · LLM 보안 | PII 탐지 규칙 설계, 마스킹 처리 |

각자 보안 축 하나를 끝까지 책임지고, 발표에서도 자기 축을 자기가 설명한다.

---

## 문서

| 문서 | 내용 |
|---|---|
| [docs/CONVENTIONS.md](docs/CONVENTIONS.md) | **협업 규칙** — 브랜치 · 커밋 · PR · 네이밍 · 코드 스타일. 작업 시작 전 필독 |
| [docs/DECISIONS.md](docs/DECISIONS.md) | **정한 것 / 아직 안 정한 것** — 첫 회의 안건 |
| [docs/PLAN.md](docs/PLAN.md) | 2주 일정 · 기능 티어 · 게이트 |
| [docs/SECURITY.md](docs/SECURITY.md) | 보안 4축 · 탐지 규칙 · 시연 시나리오 |
| [CLAUDE.md](CLAUDE.md) | AI 공통 컨텍스트 — API 계약 · 스키마 · 규칙 ID |

---

## 시작하기

> 아직 코드가 없다. Day 1에 셋이 같이 앉아서 아래를 진행한다.

```bash
git clone git@github.com:kcg020529/firebooking.git
cd firebooking
```

Day 1 세팅 순서는 [docs/PLAN.md](docs/PLAN.md)의 Day 1 항목을 따른다.

### 환경변수

`.env.local`(로컬)과 Vercel 대시보드 Environment Variables(배포) **양쪽 다** 넣어야 한다.

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...     # Auth용. 노출돼도 되는 키
SUPABASE_SERVICE_ROLE_KEY=eyJ...         # 서버 전용. 절대 NEXT_PUBLIC_ 금지
ANTHROPIC_API_KEY=sk-ant-...             # 서버 전용
IP_HASH_SALT=...                         # IP 해시용 솔트
```

`NEXT_PUBLIC_` 접두사가 붙은 값은 브라우저에 그대로 노출된다.
**anon 키는 붙여도 되고 service_role 키는 절대 안 된다.**

---

## 상태

- [x] 저장소 · 협업 문서
- [ ] Day 1 세팅 (Next.js · Supabase · Vercel · 스키마 · 로깅 미들웨어)
- [ ] Tier 0 — 예약 2경로 · 로그인 · 보안 4축 최소 구현
- [ ] Tier 1 — 알림 · 리포트 · 규칙 확장
- [ ] 발표
