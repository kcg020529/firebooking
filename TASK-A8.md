# A8. 전체 API 응답 개인정보 유출 탐지 확대

## 문제

`lib/security/apiLog.js`는 모든 `withApiLog()` API 응답에서 키·토큰 유출을 검사하지만, 개인정보 탐지는 챗봇 출력(`outputGuard.js`)에만 적용되어 있었다. 예약·조회·관리자 API 응답에 전화번호, 이메일 등 개인정보가 섞여도 공통 보안 이벤트로 탐지되지 않을 수 있었다.

## 목표

- 모든 `withApiLog()` API 응답에 기존 `detectAndMaskPii()`를 적용한다.
- `PII_*` 규칙별 `security_events`를 기록한다.
- 이벤트 증거에는 API 경로와 규칙만 남기고 응답 원문과 개인정보는 저장하지 않는다.
- 기존 `LEAK_SECRET` 탐지와 API 응답 동작을 유지한다.

## 인수 조건

- [ ] 전체 API 응답에서 PII 규칙을 검사한다.
- [ ] 전화번호·이메일 등 탐지 시 `category=pii`, 해당 `PII_*` rule_id로 기록한다.
- [ ] `security_events.evidence`에 원문 응답이나 원문 PII가 없다.
- [ ] 키 유출 탐지(`LEAK_SECRET`)가 계속 동작한다.
- [ ] 로그 저장 실패가 API 응답을 실패시키지 않는다.
- [ ] `npm test`, `npm run lint`, `npm run build`가 통과한다.

## 범위

이번 작업은 응답 후 탐지·기록이다. 이미 전송된 응답을 차단하거나 마스킹하는 작업은 별도 과제로 둔다.

## Preview 증거 수집용 임시 QA

`app/api/qa/pii-response/route.js`는 A8 검증을 위해 Preview에서만 활성화되는 임시 경로다. `PII_QA_ENABLED=true`, `PII_QA_TOKEN`을 Preview 환경변수로 설정하고 `x-pii-qa-token` 헤더를 맞춰야 가짜 전화번호·이메일 응답을 반환한다. Supabase 이벤트 캡처 후 이 라우트와 Preview 환경변수를 삭제한다.
