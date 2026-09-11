const fs = require('fs');
const path = require('path');
const out = path.join(process.cwd(), '.ua', 'intermediate');
const batches = {};
const nodes = (index) => (batches[index] ??= { nodes: [], edges: [] }).nodes;
const edges = (index) => (batches[index] ??= { nodes: [], edges: [] }).edges;
const add = (index, node) => nodes(index).push(node);
const edge = (index, source, target, type, weight) => edges(index).push({ source, target, type, direction: 'forward', weight });
const codeFile = (index, filePath, summary, complexity, tags) => add(index, { id: `file:${filePath}`, type: 'file', name: path.basename(filePath), filePath, summary, tags, complexity });
const config = (index, filePath, summary, complexity, tags) => add(index, { id: `config:${filePath}`, type: 'config', name: path.basename(filePath), filePath, summary, tags, complexity });
const doc = (index, filePath, summary, complexity, tags) => add(index, { id: `document:${filePath}`, type: 'document', name: path.basename(filePath), filePath, summary, tags, complexity });
const fn = (index, filePath, name, lineRange, summary, complexity, tags) => add(index, { id: `function:${filePath}:${name}`, type: 'function', name, filePath, lineRange, summary, tags, complexity });
const table = (index, filePath, name, summary, complexity, tags, lineRange) => add(index, { id: `table:${filePath}:${name}`, type: 'table', name, filePath, summary, tags, complexity, ...(lineRange ? { lineRange } : {}) });
const bind = (index, filePath, names, exported = []) => {
  for (const name of names) {
    edge(index, `file:${filePath}`, `function:${filePath}:${name}`, 'contains', 1.0);
    if (exported.includes(name)) edge(index, `file:${filePath}`, `function:${filePath}:${name}`, 'exports', 0.8);
  }
};
const imports = (index, filePath, targets) => targets.forEach((target) => edge(index, `file:${filePath}`, `file:${target}`, 'imports', 0.7));

// Batch 3: 관리자 경로 방어와 IP 해시 유틸리티
codeFile(3, 'app/admin/[...slug]/page.js', '정의되지 않은 관리자 하위 경로를 Next.js 404로 종료하는 catch-all 페이지입니다.', 'simple', ['관리자', '라우팅', '404-처리']);
codeFile(3, 'lib/security/authPaths.js', '일반 페이지 경로 중 로그인 또는 관리자 권한 검사가 필요한 범위를 판별합니다.', 'simple', ['보안', '경로-검사', '권한']);
codeFile(3, 'lib/security/authz.js', '관리자 접근의 허용·거부·미확인 경로 탐색을 마스킹한 감사 및 보안 이벤트로 비동기 기록합니다.', 'moderate', ['보안', '권한-감사', '이벤트-기록', 'pii-마스킹']);
codeFile(3, 'lib/security/hash.js', 'IP와 보안 식별값을 salt 기반 SHA-256 지문으로 바꾸고 요청 헤더에서 실제 클라이언트 IP를 추출합니다.', 'simple', ['보안', '해싱', 'ip-보호']);
codeFile(3, 'test/authPaths.test.js', '보호 페이지 경로 판별 규칙을 검증하는 Node 테스트입니다.', 'simple', ['테스트', '보안', '경로-검사']);
codeFile(3, 'test/security/adminPathDetection.test.js', '관리자 catch-all, 접근 감사, PII 마스킹 및 과도한 경로 길이 방어를 통합 검증합니다.', 'moderate', ['테스트', '관리자-보안', '감사-로그', 'pii-마스킹']);
codeFile(3, 'test/security/hash.test.js', 'IP 해시와 요청 IP 추출 유틸리티의 동작을 검증합니다.', 'simple', ['테스트', '해싱', '보안']);
fn(3, 'app/admin/[...slug]/page.js', 'AdminCatchAllPage', [18,20], '알 수 없는 관리자 경로에서 notFound를 호출해 404 응답을 유도합니다.', 'simple', ['관리자', '404-처리', '라우팅']);
fn(3, 'lib/security/authPaths.js', 'isProtectedPagePath', [5,12], '마이페이지와 관리자 경로 및 그 하위 경로를 보호 대상으로 반환합니다.', 'simple', ['보안', '경로-검사', '권한']);
fn(3, 'lib/security/authz.js', 'recordUnauthorizedAdminAccess', [29,65], '비인가 관리자 접근을 critical 보안 이벤트와 deny 감사 로그에 기록합니다.', 'moderate', ['보안', '권한-거부', '감사-로그']);
fn(3, 'lib/security/authz.js', 'recordAdminAccess', [68,92], '허용된 관리자 페이지 접근을 마스킹된 경로와 함께 감사 로그에 남깁니다.', 'moderate', ['보안', '권한-감사', '감사-로그']);
fn(3, 'lib/security/authz.js', 'recordUnknownAdminPath', [95,115], '존재하지 않는 관리자 경로 탐색을 anomaly 보안 이벤트로 기록합니다.', 'moderate', ['보안', '이상-탐지', '관리자']);
fn(3, 'lib/security/hash.js', 'hashIp', [13,23], 'IP 주소를 환경 변수 salt와 결합해 짧은 SHA-256 해시로 변환합니다.', 'moderate', ['보안', '해싱', 'ip-보호']);
fn(3, 'lib/security/hash.js', 'hashSecurityValue', [26,38], '민감한 보안 값을 원문 없이 비교할 수 있도록 도메인 분리된 해시로 만듭니다.', 'moderate', ['보안', '해싱', '민감정보']);
fn(3, 'lib/security/hash.js', 'getClientIp', [44,48], '프록시 전달 헤더를 우선해 요청의 클라이언트 IP를 추출합니다.', 'simple', ['보안', 'ip-추출', '요청']);
fn(3, 'test/security/adminPathDetection.test.js', 'createFakeSupabase', [11,22], '테이블별 insert 호출과 payload를 수집하는 테스트용 Supabase 클라이언트를 만듭니다.', 'simple', ['테스트', 'supabase', '테스트-더블']);
bind(3, 'app/admin/[...slug]/page.js', ['AdminCatchAllPage'], ['AdminCatchAllPage']);
bind(3, 'lib/security/authPaths.js', ['isProtectedPagePath'], ['isProtectedPagePath']);
bind(3, 'lib/security/authz.js', ['recordUnauthorizedAdminAccess','recordAdminAccess','recordUnknownAdminPath'], ['recordUnauthorizedAdminAccess','recordAdminAccess','recordUnknownAdminPath']);
bind(3, 'lib/security/hash.js', ['hashIp','hashSecurityValue','getClientIp'], ['hashIp','hashSecurityValue','getClientIp']);
bind(3, 'test/security/adminPathDetection.test.js', ['createFakeSupabase']);
imports(3, 'app/admin/[...slug]/page.js', []);
imports(3, 'lib/security/authPaths.js', []);
imports(3, 'lib/security/authz.js', ['lib/security/hash.js','lib/security/pii.js','lib/supabase.js']);
imports(3, 'lib/security/hash.js', []);
imports(3, 'test/authPaths.test.js', ['lib/security/authPaths.js']);
imports(3, 'test/security/adminPathDetection.test.js', ['app/admin/[...slug]/page.js','lib/security/authPaths.js','lib/security/authz.js']);
imports(3, 'test/security/hash.test.js', ['lib/security/hash.js']);
for (const name of ['recordUnauthorizedAdminAccess','recordAdminAccess','recordUnknownAdminPath']) edge(3, `function:lib/security/authz.js:${name}`, 'function:lib/security/pii.js:createMaskedPathEvidence', 'calls', 0.8);
edge(3, 'file:lib/security/authPaths.js', 'file:test/authPaths.test.js', 'tested_by', 0.5);
edge(3, 'file:app/admin/[...slug]/page.js', 'file:test/security/adminPathDetection.test.js', 'tested_by', 0.5);
edge(3, 'file:lib/security/authz.js', 'file:test/security/adminPathDetection.test.js', 'tested_by', 0.5);
edge(3, 'file:lib/security/authPaths.js', 'file:test/security/adminPathDetection.test.js', 'tested_by', 0.5);
edge(3, 'file:lib/security/hash.js', 'file:test/security/hash.test.js', 'tested_by', 0.5);

// Batch 5: 인증 공격 완화와 이상 징후 규칙
codeFile(5, 'lib/security/loginProtection.js', '로그인 시도 예약·확정과 잠금 이벤트 기록을 통해 경쟁 상태를 고려한 인증 브루트포스 방어를 제공합니다.', 'moderate', ['보안', '로그인-보호', '브루트포스', 'supabase']);
codeFile(5, 'lib/security/rules.js', 'API 과속, 예약번호 대입, 스캘핑, 예약 조회 브루트포스를 집계해 중복 없는 보안 이벤트를 생성합니다.', 'complex', ['보안', '이상-탐지', 'rate-limit', '감사-로그']);
codeFile(5, 'lib/security/securityConfig.js', '이상 탐지 규칙의 임계값·기간·심각도를 한곳에 선언합니다.', 'simple', ['보안', '설정', '이상-탐지']);
codeFile(5, 'lib/supabase.js', '서버 service-role 클라이언트와 브라우저 anon 클라이언트를 환경 변수 기반으로 분리 생성합니다.', 'simple', ['supabase', '클라이언트', '보안']);
codeFile(5, 'test/security/loginProtection.test.js', '로그인 시도 키와 잠금 기록 흐름을 검증하는 Node 테스트입니다.', 'moderate', ['테스트', '로그인-보호', '보안']);
codeFile(5, 'test/security/rules.test.js', 'API 속도 제한과 각 이상 탐지 규칙의 이벤트 기록 조건을 검증합니다.', 'moderate', ['테스트', '이상-탐지', '보안']);
fn(5, 'lib/security/loginProtection.js', 'createLoginLimitKey', [18,24], '정규화한 이메일과 IP 해시를 HMAC 키로 바꿔 원문 없는 로그인 제한 식별자를 생성합니다.', 'simple', ['보안', '로그인-보호', '해싱']);
fn(5, 'lib/security/loginProtection.js', 'reserveLoginAttempt', [34,44], 'Supabase RPC로 인증 전 로그인 시도 슬롯을 원자적으로 예약합니다.', 'moderate', ['보안', '로그인-보호', 'supabase']);
fn(5, 'lib/security/loginProtection.js', 'finishLoginAttempt', [47,62], '인증 결과에 따라 예약된 로그인 시도를 성공·실패·취소로 확정합니다.', 'moderate', ['보안', '로그인-보호', 'supabase']);
fn(5, 'lib/security/loginProtection.js', 'isCredentialFailure', [65,68], '오류 코드가 자격 증명 실패인지 판별해 실패 횟수 처리 대상을 구분합니다.', 'simple', ['보안', '인증', '오류-판별']);
fn(5, 'lib/security/loginProtection.js', 'recordLoginLock', [71,92], '현재 잠금 창에 같은 이벤트가 없을 때만 ANO_LOGIN_BF 보안 이벤트를 삽입합니다.', 'moderate', ['보안', '로그인-보호', '이벤트-기록']);
fn(5, 'lib/security/rules.js', 'countRecentDenies', [24,40], '지정 기간의 deny 감사 로그 수를 IP와 행동 기준으로 집계합니다.', 'moderate', ['보안', '감사-로그', '이상-탐지']);
fn(5, 'lib/security/rules.js', 'insertAnomalyOnce', [52,64], '동일 IP·규칙의 최근 이벤트를 확인해 중복 없이 이상 이벤트를 기록합니다.', 'moderate', ['보안', '이상-탐지', '이벤트-기록']);
fn(5, 'lib/security/rules.js', 'checkApiRateLimit', [67,95], '최근 API 로그 수가 임계값을 넘으면 ANO_RATE 이벤트를 비동기로 기록합니다.', 'moderate', ['보안', 'rate-limit', 'api-모니터링']);
fn(5, 'lib/security/rules.js', 'detectCodeEnumeration', [108,138], '예약번호 조회 거부 패턴을 집계해 코드 대입 공격을 탐지합니다.', 'moderate', ['보안', '이상-탐지', '예약-조회']);
fn(5, 'lib/security/rules.js', 'detectScalping', [141,173], '짧은 시간에 반복된 허용 예약 행동을 감지해 스캘핑 이벤트를 기록합니다.', 'moderate', ['보안', '이상-탐지', '예약']);
fn(5, 'lib/security/rules.js', 'detectLookupBruteForce', [176,215], '서로 다른 예약번호 지문을 반복 대입한 조회 실패를 브루트포스로 탐지합니다.', 'complex', ['보안', '브루트포스', '예약-조회']);
fn(5, 'lib/supabase.js', 'createServerClient', [13,25], '서버 전용 service role 키로 Supabase 클라이언트를 생성합니다.', 'moderate', ['supabase', '서버', '보안']);
fn(5, 'lib/supabase.js', 'createBrowserClient', [31,41], '공개 URL과 anon 키를 사용하는 브라우저 Supabase 클라이언트를 생성합니다.', 'moderate', ['supabase', '브라우저', '클라이언트']);
fn(5, 'test/security/loginProtection.test.js', 'withSecuritySecret', [12,21], '테스트 중 IP 해시 salt 환경 변수를 임시 설정하고 원상 복구합니다.', 'simple', ['테스트', '환경변수', '보안']);
fn(5, 'test/security/rules.test.js', 'createRateLimitClient', [12,39], 'API 로그 개수를 모사하는 rate-limit 테스트용 Supabase 클라이언트를 구성합니다.', 'moderate', ['테스트', 'rate-limit', 'supabase']);
fn(5, 'test/security/rules.test.js', 'createAnomalyClient', [41,78], '감사·보안 이벤트 조회와 삽입을 모사하는 이상 탐지 테스트 클라이언트를 구성합니다.', 'moderate', ['테스트', '이상-탐지', 'supabase']);
bind(5, 'lib/security/loginProtection.js', ['createLoginLimitKey','reserveLoginAttempt','finishLoginAttempt','isCredentialFailure','recordLoginLock'], ['createLoginLimitKey','reserveLoginAttempt','finishLoginAttempt','isCredentialFailure','recordLoginLock']);
bind(5, 'lib/security/rules.js', ['countRecentDenies','insertAnomalyOnce','checkApiRateLimit','detectCodeEnumeration','detectScalping','detectLookupBruteForce'], ['checkApiRateLimit','detectCodeEnumeration','detectScalping','detectLookupBruteForce']);
bind(5, 'lib/supabase.js', ['createServerClient','createBrowserClient'], ['createServerClient','createBrowserClient']);
bind(5, 'test/security/loginProtection.test.js', ['withSecuritySecret']);
bind(5, 'test/security/rules.test.js', ['createRateLimitClient','createAnomalyClient']);
imports(5, 'lib/security/loginProtection.js', ['lib/security/securityConfig.js','lib/supabase.js']);
imports(5, 'lib/security/rules.js', ['lib/security/securityConfig.js','lib/supabase.js']);
imports(5, 'lib/security/securityConfig.js', []);
imports(5, 'lib/supabase.js', []);
imports(5, 'test/security/loginProtection.test.js', ['lib/security/loginProtection.js']);
imports(5, 'test/security/rules.test.js', ['lib/security/rules.js','lib/security/securityConfig.js']);
for (const name of ['reserveLoginAttempt','finishLoginAttempt','recordLoginLock']) edge(5, `function:lib/security/loginProtection.js:${name}`, 'function:lib/supabase.js:createServerClient', 'calls', 0.8);
for (const name of ['checkApiRateLimit','detectCodeEnumeration','detectScalping','detectLookupBruteForce']) edge(5, `function:lib/security/rules.js:${name}`, 'function:lib/supabase.js:createServerClient', 'calls', 0.8);
edge(5, 'function:lib/security/rules.js:checkApiRateLimit', 'function:lib/security/rules.js:insertAnomalyOnce', 'calls', 0.8);
edge(5, 'function:lib/security/rules.js:detectCodeEnumeration', 'function:lib/security/rules.js:countRecentDenies', 'calls', 0.8);
for (const name of ['detectCodeEnumeration','detectScalping','detectLookupBruteForce']) edge(5, `function:lib/security/rules.js:${name}`, 'function:lib/security/rules.js:insertAnomalyOnce', 'calls', 0.8);
edge(5, 'file:lib/security/loginProtection.js', 'file:test/security/loginProtection.test.js', 'tested_by', 0.5);
edge(5, 'file:lib/security/rules.js', 'file:test/security/rules.test.js', 'tested_by', 0.5);

// Batch 6: 챗봇 입력·출력 경계
codeFile(6, 'lib/ai/chatService.js', '대화 입력 검사, PII 마스킹 로그, LLM 응답 생성과 출력 검사를 조합해 안전한 챗봇 서비스를 생성합니다.', 'moderate', ['ai', '챗봇', '보안', 'pii-마스킹']);
codeFile(6, 'lib/security/chatGuard.js', '대화 턴 수·메시지 형식을 검증하고 프롬프트 인젝션 검사를 적용합니다.', 'moderate', ['보안', '챗봇', '입력-검증', '프롬프트-인젝션']);
codeFile(6, 'lib/security/injection.js', '프롬프트 인젝션 규칙을 정규식으로 검사하고 가장 높은 심각도의 탐지 결과를 반환합니다.', 'moderate', ['보안', '프롬프트-인젝션', '규칙-탐지']);
codeFile(6, 'test/ai/chatService.test.js', '안전한 챗봇 서비스의 로깅·차단·응답 정리 흐름을 검증합니다.', 'moderate', ['테스트', 'ai', '챗봇']);
codeFile(6, 'test/security/injection.test.js', '프롬프트 인젝션 규칙과 채팅 입력 가드의 차단 동작을 검증합니다.', 'moderate', ['테스트', '보안', '프롬프트-인젝션']);
fn(6, 'lib/ai/chatService.js', 'sanitizeQuickReplies', [24,40], '길이와 출력 보안 검사를 통과한 짧은 답장 후보만 사용자에게 노출합니다.', 'moderate', ['ai', '출력-검증', '챗봇']);
fn(6, 'lib/ai/chatService.js', 'createChatService', [42,169], '의존성을 주입받아 입력 검사, 로그 마스킹, LLM 생성, 출력 차단을 수행하는 챗봇 처리 함수를 만듭니다.', 'complex', ['ai', '챗봇', '보안', '의존성-주입']);
fn(6, 'lib/security/chatGuard.js', 'validateChatMessages', [11,53], '역할·내용·길이·턴 수를 검사해 유효한 채팅 메시지 배열만 허용합니다.', 'moderate', ['보안', '입력-검증', '챗봇']);
fn(6, 'lib/security/chatGuard.js', 'inspectChatMessages', [55,76], '검증된 대화의 텍스트를 대상으로 프롬프트 인젝션 결과를 반환합니다.', 'moderate', ['보안', '프롬프트-인젝션', '챗봇']);
fn(6, 'lib/security/injection.js', 'detectPromptInjection', [60,81], '입력 문자열에 대한 모든 인젝션 규칙 일치와 최고 심각도를 계산합니다.', 'moderate', ['보안', '프롬프트-인젝션', '규칙-탐지']);
fn(6, 'test/ai/chatService.test.js', 'createHarness', [8,20], '생성·보안 이벤트·채팅 로그 호출을 관찰할 수 있는 챗봇 테스트 하니스를 구성합니다.', 'simple', ['테스트', 'ai', '테스트-더블']);
bind(6, 'lib/ai/chatService.js', ['sanitizeQuickReplies','createChatService'], ['createChatService']);
bind(6, 'lib/security/chatGuard.js', ['validateChatMessages','inspectChatMessages'], ['validateChatMessages','inspectChatMessages']);
bind(6, 'lib/security/injection.js', ['detectPromptInjection'], ['detectPromptInjection']);
bind(6, 'test/ai/chatService.test.js', ['createHarness']);
imports(6, 'lib/ai/chatService.js', ['lib/security/chatGuard.js','lib/security/outputGuard.js','lib/security/pii.js']);
imports(6, 'lib/security/chatGuard.js', ['lib/security/injection.js']);
imports(6, 'lib/security/injection.js', []);
imports(6, 'test/ai/chatService.test.js', ['lib/ai/chatService.js']);
imports(6, 'test/security/injection.test.js', ['lib/security/chatGuard.js','lib/security/injection.js']);
edge(6, 'function:lib/security/chatGuard.js:inspectChatMessages', 'function:lib/security/injection.js:detectPromptInjection', 'calls', 0.8);
edge(6, 'function:lib/ai/chatService.js:createChatService', 'function:lib/security/chatGuard.js:inspectChatMessages', 'calls', 0.8);
edge(6, 'function:lib/ai/chatService.js:createChatService', 'function:lib/security/outputGuard.js:inspectAssistantOutput', 'calls', 0.8);
edge(6, 'function:lib/ai/chatService.js:createChatService', 'function:lib/security/pii.js:detectAndMaskPii', 'calls', 0.8);
edge(6, 'file:lib/ai/chatService.js', 'file:test/ai/chatService.test.js', 'tested_by', 0.5);
edge(6, 'file:lib/security/chatGuard.js', 'file:test/security/injection.test.js', 'tested_by', 0.5);
edge(6, 'file:lib/security/injection.js', 'file:test/security/injection.test.js', 'tested_by', 0.5);

// Batch 7: PII 마스킹과 공개 API 응답 검사
codeFile(7, 'lib/security/apiResponseGuard.js', '공개 API 응답에서 골프장 연락처를 제외한 뒤 PII 탐지 결과를 반환합니다.', 'simple', ['보안', 'api-응답', 'pii-마스킹']);
codeFile(7, 'lib/security/pii.js', '이름·전화·주민번호·카드·이메일 규칙으로 민감정보를 중첩 없이 탐지하고 마스킹된 증적을 생성합니다.', 'complex', ['보안', 'pii-마스킹', '민감정보', '규칙-탐지']);
codeFile(7, 'test/security/apiLog.test.js', 'API 응답 검사 유틸리티의 PII 탐지 결과를 검증합니다.', 'simple', ['테스트', 'api-응답', '보안']);
codeFile(7, 'test/security/apiResponseGuardImageUrl.test.js', '이미지 URL이 전화번호처럼 오탐되지 않도록 API 응답 검사 예외를 검증합니다.', 'simple', ['테스트', 'pii-마스킹', '오탐-방지']);
codeFile(7, 'test/security/pii.test.js', '각 PII 규칙의 탐지·마스킹·경로 증적 생성 동작을 검증합니다.', 'moderate', ['테스트', 'pii-마스킹', '보안']);
fn(7, 'lib/security/apiResponseGuard.js', 'omitPublicCourseContact', [3,17], '재귀적으로 공개 코스 데이터에서 phone 필드를 제거합니다.', 'moderate', ['보안', 'api-응답', '데이터-정리']);
fn(7, 'lib/security/apiResponseGuard.js', 'inspectApiResponsePii', [20,33], '공개 코스 응답은 연락처를 제거한 뒤, 다른 응답은 원문 기준으로 PII를 탐지합니다.', 'moderate', ['보안', 'api-응답', 'pii-마스킹']);
fn(7, 'lib/security/pii.js', 'maskName', [4,22], '문자 위치를 보존하면서 이름의 가운데 글자를 별표로 치환합니다.', 'moderate', ['보안', 'pii-마스킹', '이름']);
fn(7, 'lib/security/pii.js', 'collectMatches', [121,150], '규칙별 후보를 정렬하고 겹치는 범위를 제거해 안정적인 PII 일치 목록을 만듭니다.', 'moderate', ['보안', 'pii-탐지', '정규식']);
fn(7, 'lib/security/pii.js', 'detectAndMaskPii', [152,176], '문자열의 PII 일치 정보를 집계하고 원문을 노출하지 않는 마스킹 문자열을 생성합니다.', 'moderate', ['보안', 'pii-마스킹', '민감정보']);
fn(7, 'lib/security/pii.js', 'hasPii', [178,180], '옵션에 따라 무시할 규칙을 제외하고 PII 존재 여부를 반환합니다.', 'simple', ['보안', 'pii-탐지', '검사']);
fn(7, 'lib/security/pii.js', 'createMaskedEvidence', [182,185], '길이를 제한한 마스킹 증적 문자열을 생성해 로그 원문 유출을 방지합니다.', 'simple', ['보안', '감사-로그', 'pii-마스킹']);
fn(7, 'lib/security/pii.js', 'createMaskedPathEvidence', [188,207], 'URL 경로를 안전하게 디코드하고 각 세그먼트의 PII를 마스킹해 증적으로 만듭니다.', 'moderate', ['보안', '경로-검사', 'pii-마스킹']);
bind(7, 'lib/security/apiResponseGuard.js', ['omitPublicCourseContact','inspectApiResponsePii'], ['inspectApiResponsePii']);
bind(7, 'lib/security/pii.js', ['maskName','collectMatches','detectAndMaskPii','hasPii','createMaskedEvidence','createMaskedPathEvidence'], ['detectAndMaskPii','hasPii','createMaskedEvidence','createMaskedPathEvidence']);
imports(7, 'lib/security/apiResponseGuard.js', ['lib/security/pii.js']);
imports(7, 'lib/security/pii.js', []);
imports(7, 'test/security/apiLog.test.js', ['lib/security/apiResponseGuard.js']);
imports(7, 'test/security/apiResponseGuardImageUrl.test.js', ['lib/security/apiResponseGuard.js']);
imports(7, 'test/security/pii.test.js', ['lib/security/pii.js']);
edge(7, 'function:lib/security/apiResponseGuard.js:inspectApiResponsePii', 'function:lib/security/pii.js:detectAndMaskPii', 'calls', 0.8);
edge(7, 'file:lib/security/apiResponseGuard.js', 'file:test/security/apiLog.test.js', 'tested_by', 0.5);
edge(7, 'file:lib/security/apiResponseGuard.js', 'file:test/security/apiResponseGuardImageUrl.test.js', 'tested_by', 0.5);
edge(7, 'file:lib/security/pii.js', 'file:test/security/pii.test.js', 'tested_by', 0.5);

// Batch 9: 공통 레이아웃과 클라이언트 UI
codeFile(9, 'app/layout.js', '전역 CSS·메타데이터와 공통 헤더·채팅 위젯을 포함하는 App Router 루트 레이아웃입니다.', 'simple', ['nextjs', '레이아웃', '공통-ui']);
codeFile(9, 'components/SiteHeader.js', '인증 상태와 프로필 역할을 구독해 사용자 메뉴 및 관리자 탐색을 표시하는 클라이언트 헤더입니다.', 'moderate', ['react', '헤더', '인증', '컴포넌트']);
codeFile(9, 'components/chat/ChatWidget.js', '세션 ID를 유지하며 `/api/chat`과 통신하고 빠른 답장과 오류 상태를 렌더링하는 클라이언트 채팅 위젯입니다.', 'moderate', ['react', '챗봇', 'api-클라이언트', '컴포넌트']);
fn(9, 'app/layout.js', 'RootLayout', [21,34], '전역 페이지 골격 안에 SiteHeader, 자식 콘텐츠, ChatWidget을 배치합니다.', 'moderate', ['nextjs', '레이아웃', '공통-ui']);
fn(9, 'components/SiteHeader.js', 'SiteHeader', [13,131], '세션과 인증 변경을 동기화해 역할별 내비게이션과 로그인 상태를 렌더링합니다.', 'complex', ['react', '헤더', '인증']);
fn(9, 'components/chat/ChatWidget.js', 'createSessionId', [17,27], 'sessionStorage의 기존 세션 ID를 재사용하거나 UUID를 생성해 저장합니다.', 'moderate', ['챗봇', '세션', '브라우저']);
fn(9, 'components/chat/ChatWidget.js', 'ChatWidget', [29,193], '사용자 메시지 전송, 응답·빠른 답장 상태 갱신, 오류 처리를 수행하는 채팅 UI입니다.', 'complex', ['react', '챗봇', 'api-클라이언트']);
bind(9, 'app/layout.js', ['RootLayout'], ['RootLayout']);
bind(9, 'components/SiteHeader.js', ['SiteHeader'], ['SiteHeader']);
bind(9, 'components/chat/ChatWidget.js', ['createSessionId','ChatWidget'], ['ChatWidget']);
imports(9, 'app/layout.js', ['app/globals.css','components/SiteHeader.js','components/chat/ChatWidget.js']);
imports(9, 'components/SiteHeader.js', []);
imports(9, 'components/chat/ChatWidget.js', []);
edge(9, 'function:components/chat/ChatWidget.js:ChatWidget', 'function:components/chat/ChatWidget.js:createSessionId', 'calls', 0.8);

// Batch 11: 개발·배포 구성과 프로젝트 안내
config(11, '.env.example', 'Supabase, DeepSeek, IP 해시 salt에 필요한 공개·서버 전용 환경 변수의 예시를 제공합니다.', 'simple', ['환경변수', '보안', '설정']);
doc(11, 'AGENTS.md', '프로젝트의 보안 제약, API 계약, 데이터 모델, 챗봇 처리 순서와 협업 규칙을 정의합니다.', 'moderate', ['문서화', '보안', '개발-규약']);
doc(11, 'CLAUDE.md', 'AI 협업 도구가 따라야 할 프로젝트 구조, 보안 원칙, API와 데이터베이스 계약을 설명합니다.', 'moderate', ['문서화', '보안', '개발-규약']);
doc(11, 'README.md', 'firebooking의 보안 중심 목표, 기술 스택, 역할 분담, 문서와 실행 방법을 소개합니다.', 'moderate', ['문서화', '프로젝트-개요', '시작-안내']);
config(11, 'jsconfig.json', 'JavaScript 프로젝트의 컴파일러 옵션과 절대 경로 해석 기준을 설정합니다.', 'simple', ['설정', 'javascript', '빌드-시스템']);
config(11, 'package.json', 'Next.js 애플리케이션의 실행 스크립트와 런타임·개발 의존성을 선언합니다.', 'simple', ['설정', 'npm', '빌드-시스템']);
config(11, 'vercel.json', 'Vercel 배포의 런타임 리전을 지정합니다.', 'simple', ['설정', 'vercel', '배포']);

// Batch 12: 설계·보안·운영 문서
doc(12, 'docs/ARCHITECTURE.md', 'App Router, Supabase, 보안 모듈과 화면 계층의 분리를 설명하는 아키텍처 개요입니다.', 'simple', ['문서화', '아키텍처', '보안']);
doc(12, 'docs/CONVENTIONS.md', '브랜치·커밋·PR·AI 사용, 파일 구조, 코드 스타일과 보안 규칙을 상세히 정의합니다.', 'complex', ['문서화', '개발-규약', '보안']);
doc(12, 'docs/DATA_FLOW.md', '폼 예약, 챗봇 예약, 관리자 감사와 로그 마스킹의 데이터 이동 경로를 설명합니다.', 'moderate', ['문서화', '데이터-흐름', '보안']);
doc(12, 'docs/DECISIONS.md', '프로젝트 범위, 우선순위, 협업 방식에 관한 초기 의사결정을 기록합니다.', 'moderate', ['문서화', '의사결정', '프로젝트-관리']);
doc(12, 'docs/DEEPSEEK_SETUP.md', 'DeepSeek API 환경 변수 설정과 자동·실연·공격 내성 검증 절차를 안내합니다.', 'moderate', ['문서화', 'deepseek', '보안']);
doc(12, 'docs/LLM_SECURITY_TESTS.md', '프롬프트 인젝션과 PII 유출 방어를 확인하는 LLM 보안 테스트 시나리오를 정리합니다.', 'moderate', ['문서화', 'llm-보안', '테스트']);
doc(12, 'docs/MENTOR_FEEDBACK_REMEDIATION.md', '관리자 경로 탐색 취약점에 대한 멘토 피드백, 수정 내역과 검증 근거를 기록합니다.', 'moderate', ['문서화', '보안', '개선-이력']);
doc(12, 'docs/PLAN.md', '2주 일정, 기능 우선순위, 담당자별 작업과 발표 준비 체크리스트를 제공합니다.', 'moderate', ['문서화', '프로젝트-관리', '계획']);
config(12, 'docs/SBOM.cdx.json', 'CycloneDX 형식으로 애플리케이션 의존성과 구성 요소를 열거한 소프트웨어 자재 명세입니다.', 'complex', ['설정', 'sbom', '공급망-보안']);
doc(12, 'docs/SBOM.md', 'SBOM 생성 명령과 산출물 위치를 간단히 안내합니다.', 'simple', ['문서화', 'sbom', '공급망-보안']);
doc(12, 'docs/SECURITY.md', 'PII 마스킹, 인젝션 탐지, API 모니터링, 권한 감사의 설계와 시연 기준을 정의합니다.', 'moderate', ['문서화', '보안', 'pii-마스킹']);
doc(12, 'docs/STACK.md', '프런트엔드, 백엔드, 데이터베이스, AI 보안과 운영 도구의 기술 스택을 설명합니다.', 'simple', ['문서화', '기술-스택', '아키텍처']);

// Batch 13: Supabase 데이터베이스 정의·RLS 정책·데모 데이터
table(13, 'supabase/policies.sql', 'policies', '모든 서비스·보안 테이블의 RLS 활성화와 역할별 접근 정책을 정의합니다.', 'complex', ['데이터베이스', 'rls-정책', '보안']);
table(13, 'supabase/schema.sql', 'schema', '골프 예약, 사용자 프로필, API·감사·보안·채팅 로그와 로그인 제한 테이블 및 RPC를 정의합니다.', 'complex', ['데이터베이스', '스키마', '보안']);
table(13, 'supabase/seed.sql', 'seed', '데모용 필드·스크린 골프장과 향후 14일 예약 슬롯을 반복 실행 가능하게 채웁니다.', 'complex', ['데이터베이스', '시드-데이터', '예약']);
table(13, 'supabase/schema.sql', 'courses', '골프장 기본 정보와 공개 표시용 주소·연락처·이미지 데이터를 저장합니다.', 'moderate', ['데이터베이스', '스키마', '골프장'], [13,23]);
table(13, 'supabase/schema.sql', 'slots', '골프장별 날짜·시간·가격·정원과 예약 인원 수를 저장합니다.', 'moderate', ['데이터베이스', '스키마', '예약-슬롯'], [26,38]);
table(13, 'supabase/schema.sql', 'bookings', '예약번호와 원본 이름·전화번호를 포함한 예약 정보를 저장하는 유일한 PII 원본 테이블입니다.', 'moderate', ['데이터베이스', '예약', 'pii-보호'], [43,54]);
table(13, 'supabase/schema.sql', 'profiles', 'Supabase Auth 사용자와 표시 이름·역할을 연결합니다.', 'simple', ['데이터베이스', '프로필', '권한'], [61,68]);
table(13, 'supabase/schema.sql', 'api_logs', 'API 요청 메서드·경로·상태·지연 시간·IP 해시를 기록합니다.', 'moderate', ['데이터베이스', 'api-모니터링', '보안'], [71,81]);
table(13, 'supabase/schema.sql', 'audit_logs', '행위자·대상·허용 여부·IP 해시로 접근 감사 결과를 기록합니다.', 'moderate', ['데이터베이스', '감사-로그', '보안'], [84,94]);
table(13, 'supabase/schema.sql', 'security_events', '탐지 규칙, 심각도, 증적을 보존한 보안 이벤트를 기록합니다.', 'moderate', ['데이터베이스', '보안-이벤트', '이상-탐지'], [97,107]);
table(13, 'supabase/schema.sql', 'chat_logs', '세션별 역할과 PII 마스킹된 채팅 내용만 저장합니다.', 'simple', ['데이터베이스', '챗봇', 'pii-마스킹'], [110,117]);
table(13, 'supabase/schema.sql', 'login_attempt_limits', '해시 키별 실패·대기 시도 수와 잠금 시각을 원자적으로 관리합니다.', 'simple', ['데이터베이스', '로그인-보호', 'rate-limit'], [122,129]);
for (const name of ['courses','slots','bookings','profiles','api_logs','audit_logs','security_events','chat_logs','login_attempt_limits']) edge(13, 'table:supabase/schema.sql:schema', `table:supabase/schema.sql:${name}`, 'migrates', 0.7);
edge(13, 'table:supabase/policies.sql:policies', 'table:supabase/schema.sql:schema', 'related', 0.5);
edge(13, 'table:supabase/seed.sql:seed', 'table:supabase/schema.sql:courses', 'related', 0.5);
edge(13, 'table:supabase/seed.sql:seed', 'table:supabase/schema.sql:slots', 'related', 0.5);

for (const [index, fragment] of Object.entries(batches)) {
  const destination = path.join(out, `batch-${index}.json`);
  fs.writeFileSync(destination, `${JSON.stringify(fragment, null, 2)}\n`, 'utf8');
  console.log(`batch-${index}.json nodes=${fragment.nodes.length} edges=${fragment.edges.length}`);
}
