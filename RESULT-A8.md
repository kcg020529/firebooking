# A8 결과 — 전체 API 응답 개인정보 유출 탐지 확대

## 1. 문제

키·토큰 유출은 `lib/security/apiLog.js`의 공통 API 로깅에서 검사하고 있었지만, 개인정보 탐지는 챗봇 응답의 `outputGuard.js`에만 적용되어 있었다. 따라서 예약·조회·관리자 API 응답에 전화번호, 이메일 등이 잘못 포함되어도 공통 `security_events` 탐지로 이어지지 않을 수 있었다.

## 2. 보완 내용

- `lib/security/responseScan.js` 추가
  - 기존 `scanForSecrets()`와 `detectAndMaskPii()`를 하나의 응답 검사 단계로 묶음
  - `PII_*` 이벤트의 안전한 증거 생성
- `lib/security/apiLog.js` 수정
  - `withApiLog()`가 감싸는 모든 JSON/text API 응답에 PII 검사 적용
  - 탐지 시 `security_events`에 `category=pii`, 규칙별 `PII_*` 기록
  - 증거에는 API 경로와 규칙만 저장하고 응답 원문은 저장하지 않음
- 기존 `LEAK_SECRET` 키 유출 탐지는 유지
- API 응답 및 로깅 실패 처리 방식은 유지
- `test/security/responseScan.test.js` 추가

이번 변경은 응답 후 탐지·기록이다. 이미 전송된 응답을 사전에 차단하거나 마스킹하는 것은 별도 과제다.

## 3. 자동 검증

```text
npm test       98개 중 97 pass / 0 fail / 1 skip
npm run lint   통과
npm run build  통과
```

새 테스트는 다음을 검증한다.

- API 응답의 전화번호·이메일을 `PII_*` 규칙으로 탐지
- 기존 키 유출 규칙(`PROVIDER_API_KEY`) 유지
- PII 이벤트 증거에 원문 개인정보가 들어가지 않음

## 4. 작업 후 확인 가이드

### 4-1. 코드 범위 확인

1. `app/api/**/route.js`를 열어 각 API가 `withApiLog()`로 감싸져 있는지 확인한다.
2. `lib/security/apiLog.js`에서 `inspectResponseBody()` 호출을 확인한다.
3. `lib/security/responseScan.js`에서 PII 탐지와 안전한 이벤트 증거 생성을 확인한다.

### 4-2. 자동 테스트 캡처

1. 작업 브랜치에서 터미널을 연다.
2. `npm test`를 실행한다.
3. 전체 테스트 수, pass, fail, skip가 보이도록 캡처한다.
4. `npm run lint`와 `npm run build`도 각각 실행하고 성공 결과를 캡처한다.

### 4-3. Supabase 보안 이벤트 확인

운영 API에 실제 개인정보를 일부러 반환시키지 않는다. Preview 또는 테스트 환경에서 통제된 테스트 데이터가 이미 존재하는 경우에만 확인한다.

1. Supabase Dashboard를 연다.
2. `Table Editor → security_events`로 이동한다.
3. 최신 행을 확인한다.
4. 다음 값을 확인한다.

```text
category = pii
rule_id = PII_PHONE 또는 PII_EMAIL 등
evidence = API 경로와 규칙 설명만 포함
evidence에 전화번호·이메일 원문 없음
```

실제 PII 응답 이벤트가 운영 DB에 없다면, 자동 테스트 결과를 A8의 주된 증거로 사용한다. 로그를 만들기 위해 운영 API에 개인정보를 노출시키는 것은 하지 않는다.

## 5. Notion 기록용 문장

> 기존에는 키·토큰 유출 탐지는 전체 API 응답에 적용되어 있었으나 개인정보 유출 탐지는 챗봇 응답에만 적용되어 있었다. `lib/security/apiLog.js`의 공통 응답 검사에 기존 `detectAndMaskPii()`를 추가하여 예약·조회·관리자 등 모든 `withApiLog()` API 응답에서 개인정보를 탐지하도록 보완했다. 탐지 시 `PII_PHONE`, `PII_EMAIL` 등의 규칙 ID와 API 경로를 `security_events`에 기록하며, 이벤트 증거에는 응답 원문과 개인정보를 저장하지 않는다. 전체 테스트 97 pass, lint 및 production build 통과를 확인했다.

## 6. 파일

- `lib/security/responseScan.js`
- `lib/security/apiLog.js`
- `test/security/responseScan.test.js`
- `TASK-A8.md`

## 7. Preview에서 실제 이벤트를 확인하는 방법

이 절차는 운영 개인정보를 사용하지 않고 합성된 QA 값만 사용한다.

1. Vercel Project → Settings → Environment Variables로 이동한다.
2. Preview 환경에만 다음 두 변수를 추가한다.

```text
PII_QA_ENABLED=true
PII_QA_TOKEN=[임의의 긴 테스트 토큰]
```

3. PR에 새 배포가 생성되면 PowerShell에서 실행한다.

```powershell
curl.exe -i `
  -H "x-pii-qa-token: [위에서 입력한 토큰]" `
  "https://[A8 Preview 도메인]/api/qa/pii-response"
```

4. 응답이 `200`이고 합성 전화번호·이메일 JSON이 보이는지 확인한다.
5. 10~30초 뒤 Supabase `security_events`를 새로고침한다.
6. `category = pii`인 새 행에서 `PII_PHONE`, `PII_EMAIL`과 `/api/qa/pii-response` 경로를 확인한다.
7. `evidence`에 합성 개인정보 원문이 없는지 확인한다.
8. 캡처 후 `PII_QA_ENABLED`, `PII_QA_TOKEN`을 삭제하고 임시 QA 라우트도 삭제한다.
