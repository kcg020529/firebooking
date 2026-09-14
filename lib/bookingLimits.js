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

/**
 * 한 전화번호로 동시에 들고 있을 수 있는 미래 예약 수 상한.
 *
 * 비로그인 예약은 무료·무검증이라, 한 명이 슬롯을 무한히 잡아 다른 사람이
 * 예약하지 못하게 만드는 고갈 공격이 가능하다. 같은 전화번호로 잡는 미래
 * 예약을 이 값으로 묶어 독점을 막는다. (지난 슬롯은 세지 않는다)
 */
export const MAX_ACTIVE_BOOKINGS_PER_PHONE = 2;
