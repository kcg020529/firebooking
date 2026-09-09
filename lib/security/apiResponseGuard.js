import { detectAndMaskPii } from './pii.js';

function omitPublicCourseContact(value) {
  if (Array.isArray(value)) return value.map(omitPublicCourseContact);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      key === 'name' || key === 'phone' ? '' : omitPublicCourseContact(entry),
    ]),
  );
}

/** 공개 골프장의 name·phone 필드만 제외하고 나머지 응답은 그대로 검사한다. */
export function inspectApiResponsePii(path, bodyText) {
  if (!bodyText) return [];

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
