/**
 * 예약 폼 입력값 상한.
 *
 * 서버(lib/bookings.js)가 최종 검증을 하고, 클라이언트(app/book/[slotId]/page.js)는
 * 같은 값으로 미리 막기만 한다. 두 곳에 값을 따로 적어두면 한쪽만 바뀌었을 때
 * 서버는 허용/거부하는데 폼은 다르게 동작하는 어긋남이 생긴다.
 */

export const MIN_PARTY_SIZE = 1;
export const MAX_PARTY_SIZE = 4;

export const NAME_MAX_LENGTH = 20;
export const MEMO_MAX_LENGTH = 200;
