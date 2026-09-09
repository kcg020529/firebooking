# A8. 전체 API 응답 개인정보 유출 탐지

## 문제

키·토큰 유출은 공통 API 로깅에서 검사하고 있었지만, 개인정보 탐지는 챗봇 출력에만 적용되어 있었다. 예약·조회·관리자 API 응답에 개인정보가 잘못 포함될 경우 공통 보안 이벤트로 탐지되지 않을 수 있었다.

## 보완

`withApiLog()`가 감싸는 응답 본문에 기존 `detectAndMaskPii()`를 적용했다. 탐지된 규칙별로 `security_events`에 `category=pii`와 `PII_*` rule ID를 기록한다. 로그 증거는 API 경로와 규칙 설명만 사용하며 응답 원문과 개인정보는 저장하지 않는다. 기존 `LEAK_SECRET` 검사는 함께 유지된다.

## 범위

이번 작업은 응답 후 탐지·기록이다. 응답을 사용자에게 보내기 전에 차단하거나 마스킹하는 기능은 별도 작업으로 분리한다.

## 검증

- `npm test`: 98개 중 97 pass, 0 fail, 1 skip
- `npm run lint`: 통과
- `npm run build`: 통과
- `test/security/responseScan.test.js`: PII 탐지, 키 탐지 유지, 원문 미저장 검증
