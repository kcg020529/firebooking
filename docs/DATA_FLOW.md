# 데이터 흐름

## 일반 예약

```text
브라우저 예약 폼
  → POST /api/bookings
  → 입력 형식·길이·전화번호 검증
  → lib/bookings.js createBooking()
  → Supabase RPC/DB (예약 원본 저장)
  → 응답에서 이름·전화번호 제거
  → apiLog가 응답 PII 검사 후 클라이언트 반환
```

예약 원본 이름·전화번호는 예약 처리에 필요한 DB 영역에만 저장하고, 로그·조회 요약 응답에는 포함하지 않는다.

## 챗봇 예약

```text
브라우저 메시지
  → POST /api/chat
  → chatGuard (메시지 길이·역할·턴 수 검증)
  → injection 탐지
  → pii.js 입력 탐지·마스킹
  → DeepSeek API (서버 전용 키)
  → tool call 인자 검증
  → lib/bookings.js 예약 함수
  → LLM 응답 outputGuard·PII 마스킹
  → chat_logs에는 마스킹본만 저장
  → 클라이언트 응답
```

## 관리자·보안 이벤트

```text
관리자 요청
  → proxy.js 보호 경로 확인
  → Supabase getUser() 서버 검증
  → requireStaff/authz 권한 검사
  → 감사 로그 allow/deny
  → security_events에 규칙 ID·심각도·마스킹 증거 저장
  → 관리자 대시보드에서 집계·조회
```

## 로그인 보호

```text
POST /api/auth/login
  → 이메일 정규화 + IP 해시
  → reserve_login_attempt RPC
  → Supabase Auth signInWithPassword
  → 성공: 실패 카운터 초기화 + 세션 타임아웃 쿠키 발급
  → 잘못된 비밀번호: 실패 카운터 증가
  → 5회 실패: 15분 잠금 + ANO_LOGIN_BF 이벤트
  → auth.login 감사 기록
```

원문 이메일·IP는 로그인 제한 테이블에 저장하지 않고 HMAC 키로만 사용한다.

## 리뷰·난이도

```text
코스 상세 페이지
  → GET /api/courses/:id/reviews
  → 공개 리뷰·평균 별점·난이도 통계 반환

예약 완료 사용자
  → POST /api/courses/:id/reviews
  → 서버 세션 확인
  → bookings → slots를 조회해 해당 코스 예약 이력 확인
  → 별점·난이도·내용 검증 및 PII 마스킹
  → course_reviews 저장
```

리뷰 작성은 DB의 `course_id + user_id` 유일 제약과 서버 예약 이력 검증으로 1인 1개만 허용한다.
