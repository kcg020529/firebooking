import fs from 'node:fs';

const tour = [
  {
    order: 1,
    title: '프로젝트와 보안 목표',
    description: 'README에서 firebooking이 필드·스크린 골프 예약을 제공하면서 PII 마스킹, 프롬프트 인젝션 탐지, API 모니터링과 접근 감사를 핵심 평가 대상으로 둔다는 점을 먼저 확인합니다. 이후 단계는 이 사용자 기능과 보안 경계가 한 흐름으로 어떻게 연결되는지 따라갑니다.',
    nodeIds: ['document:README.md']
  },
  {
    order: 2,
    title: '앱 진입과 코스 탐색',
    description: '루트 레이아웃은 전역 스타일, 공통 헤더와 채팅 위젯을 모든 화면에 배치하고, 홈 화면은 필드·스크린 유형별 코스 목록을 렌더링합니다. 즉 사용자는 이 UI 레이어에서 코스를 고른 뒤 상세·예약·리뷰 흐름으로 들어갑니다.',
    nodeIds: ['file:app/layout.js', 'file:app/page.js'],
    languageLesson: 'Next.js App Router의 layout은 하위 페이지에 공통 UI를 지속해서 제공하고, page는 URL 경로별 화면 진입점이 됩니다.'
  },
  {
    order: 3,
    title: '코스 상세 사용자 흐름',
    description: '코스 상세 페이지는 날짜별 슬롯과 리뷰 목록을 함께 동기화해 예약 링크, 리뷰 조작, 좋아요, 페이지네이션을 한 화면에서 제공합니다. 따라서 예약 가능한 코스의 경험과 예약 뒤 남기는 평가 경험이 UI에서 자연스럽게 이어집니다.',
    nodeIds: ['file:app/courses/[id]/page.js']
  },
  {
    order: 4,
    title: '리뷰 API와 좋아요',
    description: '리뷰 컬렉션 API는 목록 조회와 검증된 작성 요청을 처리하고, 개별 리뷰 API는 수정·삭제 결과를 감사합니다. 별도 좋아요 API는 인증 사용자의 상태를 원자적으로 토글하므로, 작성·수정·삭제·좋아요가 각각 명확한 서버 경계를 통해 수행됩니다.',
    nodeIds: ['file:app/api/courses/[id]/reviews/route.js', 'file:app/api/courses/[id]/reviews/[reviewId]/route.js', 'file:app/api/courses/[id]/reviews/[reviewId]/like/route.js']
  },
  {
    order: 5,
    title: '리뷰 권한과 PII 마스킹',
    description: '리뷰 서비스는 입력을 검증하고 예약 이력이 있는지 확인한 뒤에만 새 리뷰를 저장하며, 이미 작성했는지도 별도로 판별합니다. 내용은 저장 전 PII를 마스킹하고, 수정·삭제는 작성자 조건을 적용해 본인 리뷰만 바꾸도록 합니다. 이 서비스 경계가 앞 단계의 API가 신뢰할 수 있는 실제 권한과 안전한 리뷰 내용을 보장합니다.',
    nodeIds: ['file:lib/reviews.js', 'function:lib/reviews.js:canReviewCourse', 'function:lib/reviews.js:createCourseReview', 'function:lib/reviews.js:updateCourseReview', 'function:lib/reviews.js:deleteCourseReview']
  },
  {
    order: 6,
    title: '리뷰 데이터와 RLS',
    description: 'course_reviews 마이그레이션은 코스·사용자별 리뷰와 작성자 유일성, 예약 이력 기반 작성 조건을 데이터 모델에 반영합니다. review_likes 마이그레이션의 복합 키는 사용자당 좋아요 하나를 보장하고, 정책 파일의 RLS가 공개 읽기와 서버 전용 변경 권한을 구분합니다. 서비스 단계의 권한 판단을 데이터베이스 정책까지 겹쳐 방어하는 구조입니다.',
    nodeIds: ['table:supabase/migrations/20260911000000_course_reviews.sql:course_reviews', 'table:supabase/migrations/20260911000001_review_likes.sql:course_review_likes', 'table:supabase/migrations/20260911000001_review_likes.sql:review-likes-migration', 'table:supabase/policies.sql:policies'],
    languageLesson: 'SQL의 외래 키와 복합 기본 키는 관계와 중복 방지 규칙을 데이터베이스에서 강제하며, RLS는 행 단위로 읽기·변경 권한을 제한합니다.'
  },
  {
    order: 7,
    title: '단일 예약 생성 경계',
    description: '예약 폼은 API로 입력을 보내고, API는 lib/bookings.js의 createBooking 단일 진입점에 위임합니다. 이 함수는 입력을 검증한 뒤 원자적 RPC로 예약을 만들고 코드 충돌을 재시도하므로 폼과 챗봇이 서로 다른 예약 규칙을 갖지 않습니다. 조회용 요약은 이름과 전화번호를 제외해 원본 PII가 bookings 밖으로 번지지 않게 합니다.',
    nodeIds: ['file:app/book/[slotId]/page.js', 'file:app/api/bookings/route.js', 'file:lib/bookings.js', 'function:lib/bookings.js:createBooking']
  },
  {
    order: 8,
    title: '챗봇 도구 오케스트레이션',
    description: '채팅 라우트는 요청의 인증·IP 문맥과 감사 콜백을 만들고 ChatService에 전달합니다. 서비스는 LLM 생성과 서버 주도 tool 실행을 조합하며, tools 모듈은 예약 생성에 필요한 값과 예약번호·전화번호 동시 대조를 엄격히 검증합니다. 따라서 챗봇도 앞 단계의 단일 예약 경계와 안전한 조회 규칙을 그대로 사용합니다.',
    nodeIds: ['file:app/api/chat/route.js', 'file:lib/ai/chatService.js', 'file:lib/ai/tools.js', 'function:lib/ai/tools.js:validateLookupBooking']
  },
  {
    order: 9,
    title: '챗봇 방어와 감사',
    description: '대화 가드는 길이·턴 수를 검사하고 인젝션 패턴을 LLM 호출 전에 차단합니다. 통과한 대화도 채팅 로그에 저장할 때 PII를 마스킹하며, 출력 가드는 비밀값·시스템 프롬프트 조각·PII가 답변에 섞이지 않았는지 다시 검사합니다. 이 입력-처리-출력의 방어선이 보안 이벤트와 감사 가능한 증적을 남깁니다.',
    nodeIds: ['file:lib/security/chatGuard.js', 'file:lib/security/injection.js', 'file:lib/security/chatLog.js', 'file:lib/security/outputGuard.js']
  },
  {
    order: 10,
    title: '예약·리뷰·챗봇 테스트',
    description: '예약 통합 테스트는 생성·조회·정원·입력 검증을, 리뷰 테스트는 예약 이력 권한과 PII 마스킹·집계를 확인합니다. 챗봇 서비스와 tool 테스트는 차단, 로그 정리, 도구 입력 검증과 PII 없는 결과를 검증해 앞선 여러 경계가 회귀 없이 함께 동작하는지 보여줍니다.',
    nodeIds: ['file:test/bookingIntegration.test.js', 'file:test/reviews.test.js', 'file:test/ai/chatService.test.js', 'file:test/ai/tools.test.js']
  },
  {
    order: 11,
    title: '실행 환경과 배포',
    description: 'package.json은 Next.js 실행과 테스트에 필요한 의존성 및 스크립트를 선언하고, 환경 변수 예시는 공개 Supabase 값과 서버 전용 비밀값의 경계를 문서화합니다. Vercel 설정은 배포 런타임 리전을 고정하므로, 앞선 서버 전용 키·Supabase·LLM 연동을 실제 운영 환경에 연결하는 최소 배포 설정입니다.',
    nodeIds: ['config:package.json', 'config:.env.example', 'config:vercel.json']
  }
];

fs.writeFileSync(process.argv[2], JSON.stringify(tour, null, 2) + '\n');
