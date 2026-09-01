# 협업 규칙

작업 시작 전 필독. 여기 없는 상황이 생기면 **혼자 정하지 말고 단톡에 올리고, 정해지면 이 문서에 추가한다.**

원칙 하나: **규칙은 기억력이 아니라 문서에 있다.** 3명이 각자 AI를 쓰면 서로 다른 스타일의 코드가 쏟아진다. 이 문서와 [CLAUDE.md](../CLAUDE.md)가 그걸 막는 유일한 장치다.

---

## 1. 브랜치

### 규칙

- `main` = 배포 브랜치. **직접 push 금지.** GitHub Settings → Branches에서 보호 규칙을 켠다
- 모든 작업은 `main`에서 딴 브랜치에서 한다
- **브랜치 수명은 하루.** 이틀 넘어가면 쪼갠다. 2주짜리 프로젝트에서 긴 브랜치는 충돌 지옥이다

### 이름 규칙

```
<타입>/<영문-케밥-케이스>
```

| 타입 | 언제 | 예시 |
|---|---|---|
| `feat/` | 새 기능 | `feat/pii-masking` |
| `fix/` | 버그 수정 | `fix/booking-capacity-check` |
| `docs/` | 문서만 | `docs/security-rules` |
| `refactor/` | 동작 그대로, 구조만 | `refactor/extract-audit-helper` |
| `chore/` | 설정 · 의존성 | `chore/add-eslint` |

- 소문자 + 하이픈만. 한글 · 대문자 · 언더스코어 금지
- 이름에 담당자를 넣지 않는다 (`feat/donghoon-chat` ✕). 누구 것인지는 PR이 말해준다
- 이슈 번호가 있으면 뒤에 붙여도 된다 — `feat/pii-masking-12`

### 작업 시작할 때 항상

```bash
git checkout main
git pull
git checkout -b feat/pii-masking
```

`git pull`을 빼먹는 게 충돌의 90%다.

---

## 2. 커밋

### 형식 — Conventional Commits (타입은 영문, 설명은 한글)

```
<타입>: <한글 설명>

<본문 — 필요할 때만>
```

| 타입 | 용도 |
|---|---|
| `feat` | 새 기능 |
| `fix` | 버그 수정 |
| `docs` | 문서 |
| `style` | 포맷 · 세미콜론. 동작 변화 없음 |
| `refactor` | 동작 그대로 구조 개선 |
| `test` | 테스트 |
| `chore` | 빌드 · 설정 · 의존성 |

### 좋은 예 / 나쁜 예

```
✅ feat: 챗봇 로그 PII 마스킹 추가
✅ fix: 정원 초과 예약이 통과되던 문제 수정
✅ docs: 탐지 규칙 ID 목록 추가
✅ refactor: 감사 기록을 lib/security/audit.js로 분리

❌ 수정                        ← 무엇을?
❌ feat: 여러가지 수정함        ← 커밋을 쪼개라
❌ update README.md            ← 타입 없음
❌ feat: 예약 폼 유효성 검사 추가.  ← 마침표 금지
```

### 세부 규칙

- 제목 **50자 이내**, 끝에 마침표 없음
- 제목은 "무엇을 했는지"를 명사형 또는 "~ 추가/수정/분리"로
- **본문에는 what이 아니라 why를 쓴다.** what은 diff가 말해준다
- 커밋 하나 = 논리적 변경 하나. `git add .` 전에 뭐가 들어가는지 본다
- WIP 커밋을 main에 올리지 않는다. 브랜치 안에서는 자유

---

## 3. Pull Request

### 절차

1. 브랜치 push → GitHub에서 PR 생성
2. Vercel이 **미리보기 URL을 댓글로** 달아준다
3. **팀원 1명이 리뷰 후 승인** — 셀프 머지 금지
4. 승인되면 머지, 브랜치 삭제

### 리뷰어가 확인할 것

- [ ] 미리보기 URL에서 실제로 동작하는가
- [ ] 작성자가 이 코드를 **세 줄로 설명할 수 있는가** (아래 4번 참고)
- [ ] `.env` · 키 · 실제 전화번호가 섞여 들어가지 않았는가
- [ ] 새 API 라우트라면 감사 기록과 RLS 정책이 있는가

### PR 크기

**하루 안에 머지 가능한 크기로 쪼갠다.** 파일 20개짜리 PR은 아무도 제대로 못 읽고, 리뷰가 형식이 된다.

### 충돌 났을 때

```bash
git checkout feat/my-branch
git pull origin main      # main 변경사항을 내 브랜치로
# 충돌 해결 후
git add .
git commit
git push
```

`git push --force`는 쓰지 않는다. 정말 필요하면 단톡에 먼저 말한다.

---

## 4. AI 사용 규칙

셋 다 Claude · GPT를 쓴다. 그러면 **AI 세 명이 서로 다른 코드를 짜준다**는 문제가 새로 생긴다.

- **저장소 루트의 [CLAUDE.md](../CLAUDE.md)를 항상 유지한다.** API 계약 · 스키마 · 탐지 규칙 ID가 들어있고, Claude Code는 이 파일을 자동으로 읽는다. 계약이 바뀌면 **이 파일부터** 고친다
- **이해 못 한 코드는 머지 금지.** AI가 준 코드를 세 줄로 설명 못 하면 PR을 올리지 않는다. 리뷰어도 설명을 못 들으면 승인하지 않는다
  - 보안 코드는 특히 그렇다. 심사자가 "이 정규식이 왜 이렇습니까"를 물으면 답해야 한다
- **막혔을 때 "고쳐줘"를 반복하지 않는다.** 코드가 계속 바뀌어 원인이 묻힌다.
  순서: ① 에러 메시지 전문 확보 → ② Vercel 로그 · 브라우저 콘솔 확인 → ③ 그 로그를 그대로 AI에 붙여넣기
- **AI가 못 하는 일에 사람 시간을 배정한다** — Vercel 환경변수, Supabase RLS 토글, GitHub 권한, 결제. 전부 클릭 작업이다

---

## 5. 파일 · 폴더

### 폴더 구조 (Day 1에 이대로 만든다)

```
firebooking/
├─ middleware.js              ← S3 전수 로깅 · rate limit
├─ app/
│  ├─ layout.js               ← ChatWidget 삽입 (공용 파일)
│  ├─ page.js
│  ├─ courses/[id]/page.js
│  ├─ book/[slotId]/page.js
│  ├─ booking/[code]/page.js
│  ├─ login/  signup/  my/
│  ├─ admin/security/  admin/audit/  admin/report/
│  └─ api/
│     ├─ courses/route.js
│     ├─ bookings/route.js
│     ├─ bookings/lookup/route.js
│     └─ chat/route.js
├─ components/
│  ├─ CourseCard.js  SlotGrid.js  BookingForm.js
│  └─ chat/ChatWidget.js  ChatBubble.js  QuickReplies.js
├─ lib/
│  ├─ supabase.js
│  ├─ bookings.js             ← createBooking() 단일 진입점
│  ├─ security/
│  │   ├─ pii.js  injection.js  rules.js  audit.js  report.js
│  └─ ai/tools.js  ai/prompt.js
├─ supabase/schema.sql  seed.sql  policies.sql
└─ docs/
```

### 이름 규칙

| 대상 | 규칙 | 예시 |
|---|---|---|
| 폴더 | 소문자 케밥 | `admin/security/`, `book/[slotId]/` |
| React 컴포넌트 파일 | PascalCase`.js` | `CourseCard.js`, `ChatWidget.js` |
| 그 외 모듈 | camelCase`.js` | `bookings.js`, `pii.js`, `injection.js` |
| Next.js 예약 파일 | 프레임워크 고정 | `page.js`, `route.js`, `layout.js`, `middleware.js` |
| SQL | 소문자 케밥 | `schema.sql`, `policies.sql` |
| 문서 | 대문자 스네이크 | `CONVENTIONS.md`, `SECURITY.md` |

---

## 6. 코드 네이밍

| 대상 | 규칙 | 예시 |
|---|---|---|
| 변수 · 함수 | camelCase | `bookingCode`, `maskPhone()` |
| 컴포넌트 | PascalCase | `function BookingForm()` |
| 상수 | UPPER_SNAKE | `PII_RULES`, `MAX_TURNS` |
| boolean | `is` / `has` / `can` 접두 | `isMasked`, `hasPII`, `canViewAudit` |
| 이벤트 핸들러 | `handle` 접두 | `handleSubmit`, `handleQuickReply` |
| 컴포넌트 props 콜백 | `on` 접두 | `onSelect`, `onClose` |
| async 함수 | 동사로 시작 | `fetchSlots()`, `createBooking()` |

### ⚠️ 가장 중요한 것 — snake_case ↔ camelCase 경계

**DB는 snake_case, JavaScript는 camelCase.** 이걸 안 정하면 팀이 반드시 터진다.

```js
// DB (Postgres) — snake_case
booking_code, party_size, created_at, ip_hash

// JS 코드 · API 응답 JSON — camelCase
bookingCode, partySize, createdAt, ipHash
```

**변환은 딱 한 곳에서 한다** — `lib/` 안의 DB 접근 함수에서 변환해 내보낸다.
컴포넌트나 페이지에서 `booking_code`를 보게 되면 그건 버그다.

### 그 외 공통 약속

- **시간은 전부 UTC(`timestamptz`)로 저장**하고, 화면에 뿌릴 때만 KST로 바꾼다
- 금액은 원 단위 정수 (`price: 25000`). 소수점 없음
- API 응답은 항상 이 모양

```js
{ ok: true,  ...데이터 }
{ ok: false, error: "사람이 읽을 수 있는 한국어 메시지" }
```

에러 메시지를 한국어로 통일하는 이유: **챗봇이 이 문구를 그대로 사용자에게 전달**할 수 있다.

---

## 7. 보안 규칙 (이 프로젝트 특수)

보안 수업 과제다. 아래를 어기면 기능이 아니라 **평가**가 깨진다.

### 절대 커밋 금지

- `.env.local`, `.env` — Day 1에 `.gitignore`에 있는지 확인한다
- API 키 · 토큰 · Supabase `service_role` 키
- 실제 사람의 전화번호 · 이름 (시드 데이터는 전부 가짜로)

> 키가 커밋되면 **그 키는 폐기하고 재발급**한다. 커밋을 지워도 히스토리에 남는다.
> (그리고 이건 발표에 쓸 수 있는 좋은 사례다)

### 로그에 원문 PII 금지

- `chat_logs.content_masked` — 마스킹본만
- `security_events.evidence` — 마스킹된 발췌만
- 원본 PII가 저장되는 곳은 **`bookings` 테이블 단 하나**

탐지 로그가 유출 경로가 되면 본말전도다.

### 새 API 라우트를 만들면 반드시

1. 감사 기록 (`lib/security/audit.js` 호출)
2. RLS 정책 확인
3. 응답에 내부 정보(키 · 내부 URL · 스택 트레이스)가 안 섞이는지

### 탐지 규칙 ID 네이밍

```
PII_*     개인정보        PII_PHONE, PII_RRN, PII_CARD, PII_EMAIL, PII_NAME
INJ_*     프롬프트 인젝션  INJ_IGNORE, INJ_SYSPROMPT, INJ_ROLE, INJ_TOOL
ANO_*     이상 행위        ANO_SCALP, ANO_LOOKUP_BF, ANO_CODE_ENUM, ANO_RATE
AUTHZ_*   권한            AUTHZ_ADMIN
LEAK_*    유출            LEAK_SECRET
```

`severity`는 `info` / `warn` / `critical` 세 단계만. 네 번째를 만들지 않는다.

**규칙은 `lib/security/` 안의 선언형 배열에만 존재한다.** 라우트마다 정규식을 흩뿌리면 발표에서 "탐지 규칙 설계"를 설명할 수가 없다.

### 담당자 잠금

`lib/security/` 아래 파일은 **담당자만 수정한다.**
- `pii.js`, `injection.js` → C
- `rules.js`, `audit.js` → A

규칙이 여러 손을 타면 발표에서 설명이 꼬인다. 남의 파일을 고쳐야 하면 PR이 아니라 단톡으로 먼저 말한다.

---

## 8. 소통

- **매일 저녁 15분 스탠드업.** 각자 세 줄: 어제 한 것 / 오늘 할 것 / 막힌 것
- **30분 룰.** 30분 막히면 혼자 붙잡지 말고 단톡에 던진다. 셋 다 모르면 뒤 티어로 미룬다
- **API 계약이 바뀌면 즉시 공지** + `CLAUDE.md` 수정. 이게 통합 사고를 막는 방어선이다
- 공용 파일(`app/layout.js`, `middleware.js`)을 건드리기 전에 단톡에 말한다

---

## 9. 이 문서를 고치는 법

규칙이 현실과 안 맞으면 고친다. 단,

1. 단톡에서 합의
2. `docs/` PR로 올림
3. 팀원 1명 승인 후 머지

**입으로만 정한 규칙은 없는 규칙이다.**
