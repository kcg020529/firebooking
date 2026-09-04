const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 슬롯 ID가 유효한 UUID 형식인지 검증한다.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidSlotId(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value.trim());
}
