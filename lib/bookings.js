import { createServerClient } from '@/lib/supabase';
import {
  MIN_PARTY_SIZE,
  MAX_PARTY_SIZE,
  NAME_MAX_LENGTH,
  MEMO_MAX_LENGTH,
} from '@/lib/bookingLimits';

/**
 * 예약 생성 단일 진입점.
 *
 * CLAUDE.md 절대 규칙 1 — 수동 폼과 챗봇이 이 함수 하나를 같이 쓴다.
 * 예약 생성 로직을 두 벌 만들지 않는다. 챗봇 tool 도 여기를 거쳐야
 * 검증·정원 확인·감사 기록이 동일하게 적용된다.
 *
 * 인원·이름·메모 상한값은 lib/bookingLimits.js — 슬롯 정원(capacity)은 DB 가 따로 검사한다.
 */

/** 010-1234-5678 / 01012345678 / 010.1234.5678 을 모두 허용한다. */
const PHONE_PATTERN = /^01[016789][-. ]?\d{3,4}[-. ]?\d{4}$/;

/**
 * 예약번호에 쓰는 문자.
 * 0/O, 1/I/L 처럼 눈으로 헷갈리는 글자는 뺐다 —
 * 사용자가 전화로 불러주거나 손으로 옮겨 적는 번호다.
 */
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const CODE_LENGTH = 5;

/** 예약번호가 이미 있는 값과 겹쳤을 때 다시 시도하는 횟수. */
const CODE_RETRY_LIMIT = 5;

function generateBookingCode() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return `GB-${code}`;
}

/**
 * 전화번호를 010-1234-5678 형태로 통일한다.
 *
 * 저장 형태가 제각각이면 조회가 안 맞고, "동일 IP 가 서로 다른 전화번호로
 * 조회" 같은 이상 탐지(ANO_LOOKUP_BF)도 같은 번호를 다른 번호로 세게 된다.
 */
function normalizePhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

/**
 * 입력 검증. 통과하면 정규화된 값을, 실패하면 한국어 메시지를 돌려준다.
 *
 * 메시지를 한국어로 통일하는 이유: 챗봇이 이 문구를 그대로
 * 사용자에게 전달할 수 있어야 한다.
 */
function validate({ slotId, name, phone, partySize, memo, source }) {
  if (!slotId || typeof slotId !== 'string') {
    return { error: '예약할 시간을 선택해주세요.' };
  }

  const trimmedName = typeof name === 'string' ? name.trim() : '';
  if (!trimmedName) {
    return { error: '이름을 입력해주세요.' };
  }
  if (trimmedName.length > NAME_MAX_LENGTH) {
    return { error: `이름은 ${NAME_MAX_LENGTH}자 이내로 입력해주세요.` };
  }

  const trimmedPhone = typeof phone === 'string' ? phone.trim() : '';
  if (!trimmedPhone) {
    return { error: '전화번호를 입력해주세요.' };
  }
  if (!PHONE_PATTERN.test(trimmedPhone)) {
    return { error: '전화번호 형식이 올바르지 않습니다. 010-1234-5678 형태로 입력해주세요.' };
  }

  const size = Number(partySize);
  if (!Number.isInteger(size) || size < MIN_PARTY_SIZE || size > MAX_PARTY_SIZE) {
    return { error: `인원은 ${MIN_PARTY_SIZE}명에서 ${MAX_PARTY_SIZE}명까지 선택할 수 있습니다.` };
  }

  const trimmedMemo = typeof memo === 'string' ? memo.trim() : '';
  if (trimmedMemo.length > MEMO_MAX_LENGTH) {
    return { error: `메모는 ${MEMO_MAX_LENGTH}자 이내로 입력해주세요.` };
  }

  if (source !== 'form' && source !== 'chat') {
    return { error: '예약 경로가 올바르지 않습니다.' };
  }

  return {
    value: {
      slotId,
      name: trimmedName,
      phone: normalizePhone(trimmedPhone),
      partySize: size,
      memo: trimmedMemo || null,
      source,
    },
  };
}

/** DB 함수가 raise 한 예외를 사용자에게 보여줄 한국어로 바꾼다. */
function toKoreanError(message) {
  if (message.includes('CAPACITY_EXCEEDED')) {
    return '선택하신 시간의 남은 자리가 부족합니다. 다른 시간을 골라주세요.';
  }
  if (message.includes('SLOT_NOT_FOUND')) {
    return '선택하신 시간을 찾을 수 없습니다. 목록에서 다시 선택해주세요.';
  }
  if (message.includes('INVALID_PARTY_SIZE')) {
    return '인원 수가 올바르지 않습니다.';
  }
  if (message.includes('MISSING_NAME')) {
    return '이름을 입력해주세요.';
  }
  if (message.includes('MISSING_PHONE')) {
    return '전화번호를 입력해주세요.';
  }
  return null;
}

/**
 * 예약을 만든다.
 *
 * 정원 확인과 booked 증가는 DB 함수 create_booking() 이 행 잠금 아래에서
 * 한 트랜잭션으로 처리한다. 여기서 미리 조회해 확인하면 동시 요청 두 개가
 * 같은 잔여 좌석을 보고 둘 다 통과한다.
 *
 * @returns {Promise<{ ok: true, booking: object } | { ok: false, error: string }>}
 */
export async function createBooking(input) {
  const { value, error: validationError } = validate(input);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const supabase = createServerClient();

  for (let attempt = 0; attempt < CODE_RETRY_LIMIT; attempt += 1) {
    const bookingCode = generateBookingCode();

    const { data, error } = await supabase.rpc('create_booking', {
      p_slot_id: value.slotId,
      p_booking_code: bookingCode,
      p_name: value.name,
      p_phone: value.phone,
      p_party_size: value.partySize,
      p_memo: value.memo,
      p_source: value.source,
      p_user_id: input.userId ?? null,
    });

    if (!error) {
      const row = Array.isArray(data) ? data[0] : data;
      return {
        ok: true,
        booking: {
          id: row.id,
          bookingCode: row.booking_code,
          slotId: row.slot_id,
          name: row.name,
          phone: row.phone,
          partySize: row.party_size,
          memo: row.memo,
          source: row.source,
          createdAt: row.created_at,
        },
      };
    }

    const message = error.message ?? '';

    // 예약번호가 겹쳤을 때만 다시 뽑는다. 다른 실패는 재시도해도 같은 결과다.
    const isCodeCollision = error.code === '23505' && message.includes('booking_code');
    if (isCodeCollision) {
      continue;
    }

    const korean = toKoreanError(message);
    if (korean) {
      return { ok: false, error: korean };
    }

    // 예상 못 한 DB 오류. 원본 메시지에는 테이블·컬럼 구조가 드러나므로
    // 서버 로그에만 남기고 사용자에게는 일반 문구를 준다.
    console.error('[createBooking]', error);
    return { ok: false, error: '예약을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.' };
  }

  console.error('[createBooking] 예약번호 생성 재시도 한도 초과');
  return { ok: false, error: '예약번호 발급에 실패했습니다. 다시 시도해주세요.' };
}

/** 조회 결과를 화면·API 용 모양으로 정리한다. */
function toBookingSummary(row) {
  return {
    bookingCode: row.booking_code,
    partySize: row.party_size,
    memo: row.memo,
    source: row.source,
    createdAt: row.created_at,
    date: row.slots?.date ?? null,
    time: row.slots?.time ?? null,
    price: row.slots?.price ?? null,
    courseName: row.slots?.courses?.name ?? '알 수 없음',
    courseType: row.slots?.courses?.type ?? null,
  };
}

const BOOKING_SELECT = `
  booking_code, party_size, memo, source, created_at,
  slots ( date, time, price, courses ( name, type ) )
`;

/**
 * 비로그인 예약 조회.
 *
 * ⚠️ 이 함수의 설계가 이 프로젝트에서 가장 조심해야 할 부분이다.
 *
 * 예약번호만으로 조회를 열어두면 'GB-' + 5글자를 무작위 대입해
 * 남의 이름·전화번호를 긁어갈 수 있다. 그래서 예약번호 하나로는
 * 조회를 허용하지 않고 **전화번호를 함께 대조**한다.
 *
 * 이름+전화번호 조합도 마찬가지로 남의 정보를 넣으면 통과하므로,
 * 반환값에서 이름·전화번호를 아예 빼서 "이미 아는 사람만 확인 가능"
 * 상태로 만든다. 조회로 새로 알아낼 수 있는 정보가 없어야 한다.
 *
 * 챗봇의 lookup_booking tool 도 반드시 이 함수를 거친다 —
 * 모델을 설득하는 게 아니라 서버가 대조한다.
 *
 * @param {{ code?: string, phone?: string }} params
 * @returns {Promise<{ ok: true, bookings: object[] } | { ok: false, error: string }>}
 */
export async function lookupBookings({ code, phone }) {
  const trimmedCode = typeof code === 'string' ? code.trim().toUpperCase() : '';
  const trimmedPhone = typeof phone === 'string' ? phone.trim() : '';

  if (!trimmedCode || !trimmedPhone) {
    return { ok: false, error: '예약번호와 전화번호를 모두 입력해주세요.' };
  }

  if (!PHONE_PATTERN.test(trimmedPhone)) {
    return { ok: false, error: '전화번호 형식이 올바르지 않습니다.' };
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT)
    .eq('booking_code', trimmedCode)
    .eq('phone', normalizePhone(trimmedPhone))
    .limit(1);

  if (error) {
    console.error('[lookupBookings]', error);
    return { ok: false, error: '예약을 조회하지 못했습니다. 잠시 후 다시 시도해주세요.' };
  }

  if (!data || data.length === 0) {
    // 예약번호가 틀렸는지 전화번호가 틀렸는지 구분해주지 않는다.
    // 구분해주면 "번호는 맞다"는 정보를 흘려 대입을 도와주는 셈이다.
    return { ok: false, error: '일치하는 예약이 없습니다. 예약번호와 전화번호를 확인해주세요.' };
  }

  return { ok: true, bookings: data.map(toBookingSummary) };
}

/**
 * 로그인한 사용자의 예약 목록.
 *
 * user_id 로만 조회한다 — 전화번호나 이름으로 찾지 않는다.
 * 그렇게 열어두면 남의 번호를 넣어 타인 예약을 볼 수 있다.
 *
 * @param {string} userId
 */
export async function listMyBookings(userId) {
  if (!userId) return [];

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[listMyBookings]', error);
    return [];
  }

  return data.map(toBookingSummary);
}
