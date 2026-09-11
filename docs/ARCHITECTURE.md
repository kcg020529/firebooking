# 프로젝트 아키텍처

```text
사용자 브라우저
   │
   ├─ Next.js 페이지 (/, /courses, /book, /my, /admin)
   │       │
   │       └─ proxy.js
   │            ├─ /my·/admin 서버 세션 검증
   │            ├─ 30분 유휴 타임아웃 쿠키 검증·갱신
   │            └─ 요청 ID·경로 헤더 부여
   │
   └─ Next.js API Route Handler (/api/*)
          │
          ├─ 입력 검증·인증·권한 검사
          ├─ withApiLog: 요청/응답 로깅·rate limit·PII 검사
          ├─ 예약 도메인 (lib/bookings.js, lib/courses.js)
          ├─ 챗봇 도메인 (lib/ai/*)
          └─ 관리자·감사 도메인 (lib/security/*)
                    │
                    └─ Supabase 서버 클라이언트
                         ├─ Supabase Auth
                         ├─ PostgreSQL + RLS
                         ├─ 감사 로그·보안 이벤트
                         └─ 로그인 제한 RPC
```

## 핵심 경계

1. 브라우저에는 `NEXT_PUBLIC_SUPABASE_ANON_KEY`만 노출하고 service role과 DeepSeek 키는 서버 코드에서만 사용한다.
2. 예약 폼과 챗봇은 모두 `lib/bookings.js`의 단일 도메인 함수를 통과한다.
3. `/my`, `/admin` 페이지는 `proxy.js`에서 서버 세션을 확인하고, API는 각 Route Handler가 인증·권한을 다시 확인한다.
4. DB의 사용자·예약·로그 접근은 RLS와 서버 권한 검사를 함께 사용한다.
5. 로그에는 원문 개인정보를 저장하지 않고 `pii.js`의 마스킹 결과와 해시 지문만 저장한다.

