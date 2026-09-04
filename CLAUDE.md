# CLAUDE.md

이 파일은 Claude Code가 자동으로 읽는다. **세 사람의 AI가 같은 계약을 보게 만드는 장치**다.
계약이 바뀌면 코드보다 먼저 이 파일을 고친다.

---

## 프로젝트

골프 예약 사이트(필드·스크린) + 로그 보안 서비스. 보안 수업 3인 팀, 2주.
예약 기능은 그릇이고 평가 대상은 **PII 마스킹 · 프롬프트 인젝션 탐지 · API 모니터링 · 접근 감사**다.

스택: Next.js App Router (JavaScript) · Tailwind · Supabase(Postgres + Auth + RLS) · Vercel · Claude API `claude-haiku-4-5-20251001`

---

## 절대 규칙

1. **`createBooking()` 단일 진입점** — 수동 폼과 챗봇이 `lib/bookings.js`의 같은 함수를 쓴다. 예약 생성 로직을 두 벌 만들지 않는다.
2. **챗봇은 DB를 직접 건드리지 않는다** — 서버가 제공하는 tool만 호출하고, 검증·저장은 전부 서버가 한다.
3. **키는 서버에만** — `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`에 `NEXT_PUBLIC_` 접두사를 붙이지 않는다.
4. **로그에 원문 PII 금지** — 원본 PII가 저장되는 곳은 `bookings` 테이블 하나뿐. `chat_logs`·`security_events`에는 마스킹본만.
5. **보안 로직은 `lib/security/`에만** — 라우트에 정규식을 흩뿌리지 않는다.
6. **DB는 snake_case, JS는 camelCase** — 변환은 `lib/` 안의 DB 접근 함수에서 한 번만.

---

## API 계약

에러는 전부 `{ ok: false, error: "한국어 메시지" }`. 성공은 `{ ok: true, ... }`.

| Method | Path | Body / Query | 응답 |
|---|---|---|---|
| GET | `/api/courses` | `?type=field` | `[{ id, name, type, imageUrl, ... }]` |
| GET | `/api/courses/:id` | `?date=` | `{ ...course, slots: [...] }` |
| GET | `/api/slots/:slotId` | | `{ ok, slot: { ...slot, course }, course }` |
| POST | `/api/bookings` | `{ slotId, name, phone, partySize, memo, source }` | `{ ok, bookingCode }` |
| GET | `/api/bookings/lookup` | `?code=` **+** `?phone=` (둘 다 필수) | `{ ok, bookings: [{ bookingCode, courseName, courseType, date, time, partySize, memo }] }` |
| POST | `/api/chat` | `{ sessionId, messages: [...] }` | `{ reply, quickReplies?, bookingCode? }` |
| GET | `/api/admin/events` | `?severity=&category=&from=&to=` | `[{ id, ts, ruleId, category, severity, evidence }]` |
| GET | `/api/admin/audit` | `?actorId=&from=&to=` | `[{ id, ts, actorId, action, result }]` |

`source`는 `'form'` 또는 `'chat'`. 발표용 통계에 쓰이므로 반드시 채운다.

**예약 조회는 예약번호와 전화번호를 둘 다 대조한다.** 예약번호만으로 열어두면
`GB-` + 5글자를 대입해 남의 예약에서 이름·전화번호를 긁어갈 수 있다.
이름+전화번호 조합도 남의 정보를 넣으면 통과하므로 쓰지 않는다.
**응답에는 이름·전화번호를 넣지 않는다** — 조회로 새로 알아낼 수 있는 정보가 없어야 한다.
실패는 `audit_logs`에 `deny`로 남고, 반복되면 `ANO_CODE_ENUM`이 뜬다.

---

## DB 스키마

서비스 3 + 보안 5 = 8 테이블. 전문은 `supabase/schema.sql`.

```
courses          id, name, type('field'|'screen'), region, address, phone, image_url, description
slots            id, course_id, date, time, price, capacity, booked      unique(course_id,date,time)
bookings         id, slot_id, user_id, booking_code, name, phone, party_size, memo,
                 source('form'|'chat'), created_at          ★ 원본 PII는 여기에만

profiles         id(=auth.users), email, display_name, role('guest'|'user'|'staff'|'admin')
api_logs         id, ts, method, path, status, duration_ms, actor_id, ip_hash, user_agent
audit_logs       id, ts, actor_id, actor_role, action, target_type, target_id,
                 result('allow'|'deny'), ip_hash
security_events  id, ts, rule_id, category('pii'|'injection'|'anomaly'|'authz'|'leak'),
                 severity('info'|'warn'|'critical'), actor_id, ip_hash, evidence, handled
chat_logs        id, ts, session_id, role, content_masked, pii_hits    ★ 원문 저장 금지
```

**8개 테이블 전부 RLS를 켠다.** 클라이언트는 `courses`·`slots`만 읽기 허용, 나머지는 서버(`SERVICE_ROLE_KEY`) 경유. 보안 테이블 조회 정책은 `role in ('staff','admin')`.

---

## 탐지 규칙 ID

새 규칙을 만들면 이 목록에 추가한다. `severity`는 `info` / `warn` / `critical` 셋뿐.

```
PII_PHONE      PII_RRN       PII_CARD      PII_EMAIL     PII_NAME
INJ_IGNORE     INJ_IGNORE_EN INJ_SYSPROMPT INJ_ROLE      INJ_TOOL   INJ_SQL   INJ_XSS
ANO_SCALP      ANO_LOOKUP_BF ANO_CODE_ENUM ANO_RATE
AUTHZ_ADMIN
LEAK_SECRET
```

규칙 상세와 임계값은 `docs/SECURITY.md`, 구현은 `lib/security/{pii,injection,rules}.js`.

---

## 챗봇 요청 처리 순서

이 순서가 곧 방어선이다. 순서를 바꾸지 않는다.

1. 입력 검사 — 1000자 상한, 20턴 상한
2. **인젝션 탐지** — 매칭되면 LLM 호출 없이 차단 + `security_events` 기록
3. **PII 탐지** — 원문은 이번 요청 처리에만, 로그에는 마스킹본만
4. LLM 호출 (tool 목록 포함)
5. **tool 실행은 서버가** — `create_booking`은 이름·전화·slotId가 전부 있을 때만
6. 출력 검사 — 응답에 시스템 프롬프트 조각·키·타인 PII가 섞였는지

### tool 3개

```js
search_slots    { type?, courseId?, date, partySize }   // 결과에 골프장 정보 포함
create_booking  { slotId, name, phone, partySize, memo? }
lookup_booking  { code, phone }                         // ★ 둘 다 필수 — 서버가 대조
```

`lookup_booking`을 예약번호만으로 열어두면 챗봇에게 번호를 대서 타인 예약을 조회할 수 있다.
**모델을 설득하는 게 아니라 서버가 대조**한다 — tool 은 `lib/bookings.js`의 `lookupBookings()`를
그대로 호출하고, 그 함수가 예약번호와 전화번호를 함께 검사한다. tool 쪽에 별도 조회 로직을 만들지 않는다.

tool 결과에도 이름·전화번호가 들어가지 않는다. 모델에게 넘기지 않으면 모델이 흘릴 수도 없다.

---

## 코드 스타일

- 변수·함수 camelCase / 컴포넌트 PascalCase / 상수 UPPER_SNAKE
- boolean은 `is`·`has`·`can` 접두, 핸들러는 `handle` 접두, props 콜백은 `on` 접두
- 시간은 UTC(`timestamptz`)로 저장, 표시할 때만 KST
- 금액은 원 단위 정수
- 컴포넌트 파일 `PascalCase.js`, 그 외 모듈 `camelCase.js`

전체 규칙: `docs/CONVENTIONS.md`

---

## 커밋

Conventional Commits, 타입은 영문 설명은 한글. 제목 50자 이내, 마침표 없음.

```
feat: 챗봇 로그 PII 마스킹 추가
fix: 정원 초과 예약이 통과되던 문제 수정
```

브랜치는 `feat/` `fix/` `docs/` `refactor/` `chore/` + 영문 케밥. `main` 직접 push 금지.
