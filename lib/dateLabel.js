/**
 * 화면에 날짜를 표시할 때 쓰는 변환.
 *
 * 예약 폼과 예약 완료 화면이 같은 형식을 써야 해서 한 곳에 모았다.
 */

export const WEEKDAY_LABEL = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 'YYYY-MM-DD' → '9월 4일 (금)'.
 *
 * new Date('2026-09-04') 는 UTC 자정으로 해석돼 시간대에 따라 요일이 하루 밀린다.
 * 숫자를 직접 넘겨 로컬 날짜로 만든다.
 *
 * @param {string} value 'YYYY-MM-DD'
 */
export function formatDateLabel(value) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return `${month}월 ${day}일 (${WEEKDAY_LABEL[date.getDay()]})`;
}

/**
 * '10:00:00' → '10:00'.
 * DB 의 time 은 초까지 오지만 화면에는 분까지만 보여준다.
 */
export function formatTimeLabel(value) {
  return value.slice(0, 5);
}
