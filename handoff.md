# Discord 긴급 보안 알림 (Discord Security Alerts) Handoff

## 1. 아키텍처 및 핵심 결정 사항 (Decisions)
- **알림 대상**:
  - severity === 'critical'인 긴급 보안 이벤트만 Discord Webhook으로 실시간 전송합니다 (info, warn은 DB에만 영속화하고 Discord 알림은 건너뜀).
  - 해당 대상 규칙: INJ_* (프롬프트 인젝션 차단), AUTHZ_ADMIN (관리자 비인가 접근 거절), LEAK_SECRET (응답 내 비밀 유출 감지), ANO_RATE (API 분당 호출량 한도 초과).
- **보안 및 비밀 격리**:
  - Discord Webhook URL은 소스 코드, 테스트 코드, 커밋 로그, 문서에 절대 직접 하드코딩하거나 출력하지 않습니다.
  - 서버 전용 환경변수 DISCORD_SECURITY_WEBHOOK_URL에서만 읽으며, NEXT_PUBLIC_ 접두사를 절대 사용하지 않습니다.
  - 전송 증거(Evidence)에서 PII(이름, 전화번호, 이메일, 주민번호, 카드번호) 및 비밀값(JWT, DeepSeek 키, API 키, Webhook URL, Bearer 토큰)을 자동 마스킹([REDACTED_*]) 처리합니다.
  - IP 주소(ip_hash 포함), ctor_id, 사용자 인증 토큰, 쿠키, 요청 본문 원문은 Discord 페이로드에 절대 포함하지 않습니다.
  - 증거 문자열은 최대 200자로 안전하게 절단됩니다.
- **중복 전송 억제 (Deduplication)**:
  - ${rule_id}: 키를 기준으로 5분(300,000ms) 인메모리 억제 창을 적용합니다.
  - 5분 이내 동일 이벤트가 재발생해도 중복 알림을 전송하지 않아 웹훅 도배 및 Discord Rate Limit을 방지합니다.
- **네트워크 안정성 및 Best-Effort 전송**:
  - 기본 3초 타임아웃(AbortSignal.timeout(3000)).
  - Discord 429(Rate Limit) 또는 5xx(Discord 서버 장애) 발생 시 100ms 지수 백오프 후 최대 1회 재시도합니다.
  - Discord 웹훅 전송 실패(네트워크 오류, 4xx, 5xx)가 발생해도 DB 저장이나 사용자 요청 처리에 영향을 주지 않습니다.
  - 실패 시에도 서버 콘솔 로그에는 규칙 ID와 에러 코드만 남기며, Webhook URL이나 페이로드는 절대 출력하지 않습니다.
- **중앙화된 이벤트 저장 및 알림 파이프라인**:
  - lib/security/events.js를 통해 DB 영속화(security_events) 성공 후 critical 이벤트에 한해 Discord 알림을 트리거합니다.
  - 기존 5개 진입점(chatLog.js, uthz.js, piLog.js, 
ules.js, loginProtection.js)이 모두 동일한 중앙 진입점을 거칩니다.
- **관리자 보안 대시보드 연동**:
  - /api/admin/events 응답에 Webhook URL 원문 노출 없이 discordAlert: { configured: true | false }만 반환합니다.
  - 관리자 대시보드(/admin/security) 상단에 Discord 긴급 알림: 설정됨 / 미설정 상태 배지를 표시합니다.

## 2. 환경변수 등록 가이드 (Environment Instructions)
- **로컬 개발 환경 (.env.local)**:
  `env
  # Discord 긴급 보안 알림 Webhook URL (서버 전용, 따옴표 없이 등록)
  DISCORD_SECURITY_WEBHOOK_URL=https://discord.com/api/webhooks/your-channel-id/your-webhook-token
  `
- **Vercel 프로덕션/프리뷰 환경**:
  1. Vercel Dashboard → Firebooking 프로젝트 → **Settings → Environment Variables**로 이동
  2. **Key**: DISCORD_SECURITY_WEBHOOK_URL
  3. **Value**: 디스코드 채널 설정에서 발급받은 실제 Webhook URL 입력
  4. **Environments**: Production, Preview, Development 체크
  5. **Save** 클릭 후 최신 배포에 적용

## 3. 검증 체크리스트 (Checklist)
- [x] lib/security/discordAlert.js: 증거 마스킹, 5분 중복 억제, 네트워크 타임아웃, 재시도 로직 구현
- [x] lib/security/events.js: 중앙 집중식 보안 이벤트 저장 및 Best-Effort Discord 알림 디스패치 구현
- [x] 5개 진입점 통합 (chatLog.js, uthz.js, piLog.js, 
ules.js, loginProtection.js)
- [x] .env.example: DISCORD_SECURITY_WEBHOOK_URL= 주석 및 가이드 추가
- [x] pp/api/admin/events/route.js: discordAlert.configured 상태 응답 추가
- [x] pp/admin/security/page.js: 설정 여부 상태 배지 UI 반영
- [x] 	est/security/discordAlert.test.js: 단위 테스트 17개 작성 및 전원 통과 (fetch mock 사용, 실 발송 없음)
- [x] 전체 테스트 스위트(
pm test): 135개 테스트 전원 통과 (기존 118개 + 신규 17개)
- [x] ESLint 검사(
pm run lint): 에러 0건 통과
- [x] Next.js 프로덕션 빌드(
pm run build): 정상 컴파일 완료
