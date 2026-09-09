# 멘토 피드백 보완 이력

멘토링에서 확인된 취약점과 보완점을 작업별로 기록한다. 각 항목은 변경 전 문제, 원인, 수정 내용, 검증 결과와 남은 범위를 함께 남긴다. 발표 자료와 최종 보고서는 이 문서를 기준으로 작성한다.

---

## A1. 존재하지 않는 관리자 경로 탐지

### 상태

- 기능 구현: 완료
- 자동 테스트·lint·프로덕션 빌드: 완료
- Vercel Preview 비로그인 HTTP QA: 완료
- Supabase `security_events` 실제 저장: 완료
- 증빙 화면 첨부: 발표·보고서 작성 시 추가
- staff/admin 로그인 상태의 미존재 경로 404와 `audit_logs` 실제 저장: 최종 배포 QA에서 추가 확인

### 발견된 문제

변경 전에는 실제 페이지가 존재하는 관리자 경로만 `app/admin/layout.js`를 통과했다.

| 요청 | 변경 전 응답 | 권한 검사·보안 기록 |
|---|---:|---|
| `/admin` | 200 거부 화면 | 실행됨 |
| `/admin/security` | 200 거부 화면 | 실행됨 |
| `/admin/xyz123` | 루트 404 | 실행되지 않음 |
| `/admin/config/database` | 루트 404 | 실행되지 않음 |
| `/admin/` + 긴 문자열 | 루트 404 | 실행되지 않음 |

공격자가 `/admin/config`, `/admin/backup`, `/admin/.env`처럼 존재 여부를 알 수 없는 관리자 경로를 반복해서 탐색해도 `security_events`와 `audit_logs`에 기록이 남지 않았다. 따라서 실제 공격 전에 수행되는 관리자 경로 정찰 단계를 확인할 수 없었다.

### 원인

관리자 권한 검사와 로그 기록은 `app/admin/layout.js`에 있다. Next.js App Router는 요청과 매칭되는 하위 페이지가 없으면 해당 layout을 렌더하지 않고 루트 404로 처리한다.

따라서 미존재 관리자 경로는 다음 코드에 도달하지 않았다.

- `recordUnauthorizedAdminAccess()`
- `recordAdminAccess()`

이 문제는 버퍼 오버플로가 아니라 **App Router의 라우트 매칭과 권한 검사 위치 때문에 발생한 관찰성 공백**이다.

### 수정 내용

#### 1. 관리자 catch-all 라우트 추가

`app/admin/[...slug]/page.js`를 추가했다.

이제 `/admin` 아래의 미존재 1단계·다단계 경로도 Next.js 라우트 트리에 매칭되어 기존 `app/admin/layout.js`를 통과한다.

- `guest`·`user`: 권한 검사와 거부 로그 기록 후 기존 200 거부 화면
- `staff`·`admin`: 정상 접근 로그 기록 후 catch-all 페이지의 `notFound()`로 404

비인가 사용자는 실제 경로와 미존재 경로에서 동일한 거부 화면을 받으므로 경로 존재 여부를 상태 코드로 구별하기 어려워졌다.

#### 2. 공격자 제어 경로의 저장 길이 제한

공격자가 매우 긴 경로를 반복 전송할 때 로그 테이블과 관리자 화면에 불필요하게 큰 문자열이 쌓이지 않도록, `audit_logs.target_id`와 `security_events.evidence`에 사용하는 경로를 최대 200자로 제한했다.

#### 3. 경로에 포함된 개인정보 마스킹

다음과 같이 전화번호가 포함된 경로를 요청할 수 있다.

```text
/admin/user-010-1234-5678
```

로그에는 원문 대신 다음과 같이 마스킹하여 저장한다.

```text
/admin/user-010-****-5678
```

이를 위해 기존 PII 처리 함수인 `createMaskedEvidence()`를 관리자 접근 기록에도 적용했다.

#### 4. 기록 로직 테스트 보강

관리자 접근 기록 함수에 테스트용 의존성 주입 지점을 추가했다. 운영 환경에서는 기존 Supabase 클라이언트와 Next.js `after()`를 그대로 사용하며, 테스트에서는 가짜 Supabase 클라이언트로 실제 insert 페이로드를 검사한다.

다음 내용을 검증한다.

- `AUTHZ_ADMIN` 보안 이벤트 생성
- `admin.view` 감사 로그의 allow·deny 생성
- 역할과 요청 경로 기록
- 경로 내 전화번호 마스킹
- 2,000자 경로의 200자 절단
- 미존재 `/admin/*`를 보호 경로로 판별

### 변경 후 동작

| 요청 | 변경 후 비로그인 응답 | 탐지·기록 |
|---|---:|---|
| `/admin` | 200 거부 화면 | 실행됨 |
| `/admin/security` | 200 거부 화면 | 실행됨 |
| `/admin/xyz123` | 200 거부 화면 | 실행됨 |
| `/admin/config/database` | 200 거부 화면 | 실행됨 |
| `/admin/` + 180자 문자열 | 200 거부 화면 | 실행됨 |
| `/admin/user-010-1234-5678` | 200 거부 화면 | 실행됨, 전화번호 마스킹 |

### 검증 결과

#### 자동 검증

- `npm test`: 90개 중 89개 통과, 실패 0개, Supabase 실환경 테스트 1개 스킵
- `npm run lint`: 오류·경고 없이 통과
- `npm run build`: Next.js 16.3.4 Turbopack 프로덕션 빌드 통과
- 빌드 라우트: `ƒ /admin/[...slug]`

`ƒ`는 요청 시 서버에서 동적으로 실행된다는 뜻이다. 따라서 미존재 관리자 경로 요청마다 부모 layout의 권한 검사와 로그 기록이 실행된다.

#### Vercel Preview HTTP 검증

비로그인 상태에서 다음 경로가 모두 루트 404나 500으로 빠지지 않고 `접근 권한이 없습니다` 거부 화면을 반환하는 것을 확인했다.

- `/admin/xyz123`
- `/admin/config/database`
- `/admin/` + 180자 문자열
- `/admin/user-010-1234-5678`

#### Supabase 실제 저장 검증

2026-09-09 Vercel Preview에서 긴 `/admin/aaaa...` 경로를 요청한 뒤 `security_events`에 다음 기록이 생성되는 것을 확인했다.

| 컬럼 | 확인값 |
|---|---|
| `rule_id` | `AUTHZ_ADMIN` |
| `category` | `authz` |
| `severity` | `critical` |
| `actor_id` | `NULL` - 비로그인 사용자 |
| `ip_hash` | 해시값 저장 |
| `evidence` | `guest 역할이 /admin/aaaa... 접근 시도` |
| `handled` | `false` |

이 결과로 변경 전 기록되지 않던 긴 미존재 관리자 경로가 실제 배포 환경에서 탐지되고 Supabase에 저장되는 것을 확인했다.

### Before / After

```text
Before
미존재 /admin/* 요청
→ 매칭 페이지 없음
→ 루트 404
→ admin layout 미실행
→ 권한 검사와 로그 없음

After
미존재 /admin/* 요청
→ /admin/[...slug] 매칭
→ admin layout 실행
→ 권한 검사
→ security_events + audit_logs 기록
→ 비인가 사용자는 기존 거부 화면
```

### 관련 파일

- `app/admin/[...slug]/page.js`
- `app/admin/layout.js`
- `lib/security/authz.js`
- `lib/security/authPaths.js`
- `proxy.js`
- `test/security/adminPathDetection.test.js`

### PR

- GitHub PR: `#21 fix: detect and log unknown admin path scanning`

### 남은 범위

- staff/admin 로그인 상태에서 미존재 관리자 경로가 실제 HTTP 404로 처리되는지 최종 배포 환경에서 확인한다.
- `audit_logs`의 `admin.view` allow·deny와 마스킹된 `target_id`를 최종 증빙 화면에 포함한다.
- 짧은 시간에 반복되는 대량 요청의 429 차단은 후속 `ANO_RATE` 작업에서 처리한다.

### 보고서용 증빙 예정

최종 보고서 작성 시 다음 화면을 첨부한다.

1. 변경 전 미존재 `/admin/*` 요청이 404이고 로그가 없는 화면
2. 변경 후 Vercel Preview의 비인가 거부 화면
3. Supabase `security_events`의 `AUTHZ_ADMIN` 기록
4. Supabase `audit_logs`의 `admin.view deny`와 실제 `target_id`
5. PII 포함 경로가 마스킹된 기록
6. 200자를 초과한 경로가 200자로 제한된 SQL 조회 결과
