import { detectAndMaskPii } from './pii.js';

function omitPublicCourseContact(value) {
  if (Array.isArray(value)) return value.map(omitPublicCourseContact);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      // 공개 연락처와 이미지 URL은 개인정보 검사에서 제외한다.
      // 이미지 URL의 숫자 리소스 ID가 주민등록번호 정규식에 걸리는 오탐을 막는다.
      key === 'name' || key === 'phone' || key === 'imageUrl' || key === 'image_url'
        ? ''
        : omitPublicCourseContact(entry),
    ]),
  );
}

/**
 * 저장된 보안 로그를 다시 보여주는 조회 API.
 *
 * 증거·감사 기록은 저장할 때 이미 마스킹했다. 이 응답을 또 검사하면 마스킹 규칙의
 * 오탐이 하나만 저장돼 있어도 대시보드가 자동 갱신할 때마다 "응답에서 PII 탐지"
 * 이벤트가 새로 생기고, 그 이벤트가 다시 목록에 실려 끝없이 쌓인다.
 */
const STORED_SECURITY_LOG_PATHS = new Set(['/api/admin/events', '/api/admin/audit']);

/** 공개 골프장의 name·phone 필드만 제외하고 나머지 응답은 그대로 검사한다. */
export function inspectApiResponsePii(path, bodyText) {
  if (!bodyText || STORED_SECURITY_LOG_PATHS.has(path)) return [];

  let inspectedText = bodyText;
  if (path === '/api/courses' || path.startsWith('/api/courses/')) {
    try {
      inspectedText = JSON.stringify(omitPublicCourseContact(JSON.parse(bodyText)));
    } catch {
      // JSON이 아니면 공개 필드인지 확인할 수 없으므로 예외 없이 검사한다.
    }
  }

  return detectAndMaskPii(inspectedText).hits;
}
