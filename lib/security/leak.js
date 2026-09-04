/**
 * LEAK_SECRET — 우리 자신을 감시하는 규칙.
 *
 * 개발 중 실수로 API 응답에 키·토큰이 섞여 나가는 일이 실제로 자주 생긴다
 * (에러 객체를 통째로 JSON 으로 뱉거나, 환경변수를 디버깅용으로 내려보내거나).
 * 사람이 눈으로 잡을 수 없으므로 모든 응답을 자동으로 훑는다.
 *
 * 다른 탐지 규칙과 마찬가지로 선언형 배열 하나로 관리한다.
 */
export const SECRET_PATTERNS = [
  { id: 'ANTHROPIC_KEY', re: /sk-ant-[A-Za-z0-9_-]{10,}/ },
  { id: 'PROVIDER_API_KEY', re: /sk-(?!ant-)[A-Za-z0-9_-]{16,}/ },
  { id: 'SUPABASE_SECRET', re: /sb_secret_[A-Za-z0-9_-]{10,}/ },
  { id: 'SERVICE_ROLE', re: /service_role/i },
  // Supabase 구버전 키와 사용자 세션 토큰이 모두 JWT 형식이다.
  { id: 'JWT', re: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}/ },
];

/** 응답 본문이 이보다 크면 앞부분만 검사한다. 로깅이 응답보다 느려지면 안 된다. */
const MAX_SCAN_BYTES = 64 * 1024;

/**
 * 텍스트에서 유출된 비밀을 찾는다.
 * @returns {string[]} 걸린 패턴 id 목록. 비어 있으면 깨끗하다.
 */
export function scanForSecrets(text) {
  if (!text) return [];

  const target = text.length > MAX_SCAN_BYTES ? text.slice(0, MAX_SCAN_BYTES) : text;
  const hits = SECRET_PATTERNS.filter(({ re }) => re.test(target)).map(({ id }) => id);
  const configuredDeepSeekKey = process.env.DEEPSEEK_API_KEY?.trim();

  // 공급자가 키 prefix를 바꿔도 현재 서버에 설정된 실제 키는 정확히 탐지한다.
  if (
    configuredDeepSeekKey &&
    configuredDeepSeekKey.length >= 16 &&
    target.includes(configuredDeepSeekKey)
  ) {
    hits.push('DEEPSEEK_KEY');
  }

  return [...new Set(hits)];
}
