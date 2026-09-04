import test from "node:test";
import assert from "node:assert/strict";

import {
  MIN_PARTY_SIZE,
  MAX_PARTY_SIZE,
  NAME_MAX_LENGTH,
  MEMO_MAX_LENGTH,
} from "../lib/bookingLimits.js";
import { createBooking, lookupBookings, listMyBookings } from "../lib/bookings.js";
import { isValidSlotId } from "../lib/slotId.js";
import { getSlot } from "../lib/courses.js";
import { createGetSlotHandler } from "../lib/slotHandler.js";

function createFakeSupabase({ data = null, error = null } = {}) {
  return {
    from(table) {
      assert.equal(table, "slots");
      return {
        select(fields) {
          assert.ok(typeof fields === "string");
          return {
            eq(field, value) {
              assert.equal(field, "id");
              assert.ok(typeof value === "string");
              return {
                async maybeSingle() {
                  return { data, error };
                },
              };
            },
          };
        },
      };
    },
  };
}

test("예약 입력값 상한 상수가 올바르게 정의되어 있다", () => {
  assert.equal(MIN_PARTY_SIZE, 1);
  assert.equal(MAX_PARTY_SIZE, 4);
  assert.equal(NAME_MAX_LENGTH, 20);
  assert.equal(MEMO_MAX_LENGTH, 200);
});

test("createBooking: slotId 누락을 차단한다", async () => {
  const result = await createBooking({
    name: "홍길동",
    phone: "010-1234-5678",
    partySize: 2,
    source: "form",
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, "예약할 시간을 선택해주세요.");
});

test("createBooking: 이름 필수 및 길이 상한을 검증한다", async () => {
  const emptyName = await createBooking({
    slotId: "e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d",
    name: "   ",
    phone: "010-1234-5678",
    partySize: 2,
    source: "form",
  });
  assert.equal(emptyName.ok, false);
  assert.equal(emptyName.error, "이름을 입력해주세요.");

  const tooLongName = await createBooking({
    slotId: "e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d",
    name: "가".repeat(NAME_MAX_LENGTH + 1),
    phone: "010-1234-5678",
    partySize: 2,
    source: "form",
  });
  assert.equal(tooLongName.ok, false);
  assert.match(tooLongName.error, /이름은 20자 이내/);
});

test("createBooking: 전화번호 형식을 엄격히 검증한다", async () => {
  const invalidPhone = await createBooking({
    slotId: "e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d",
    name: "홍길동",
    phone: "02-123-4567",
    partySize: 2,
    source: "form",
  });
  assert.equal(invalidPhone.ok, false);
  assert.match(invalidPhone.error, /전화번호 형식/);
});

test("createBooking: 인원 수 상한(MIN/MAX_PARTY_SIZE)을 검증한다", async () => {
  const zeroParty = await createBooking({
    slotId: "e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d",
    name: "홍길동",
    phone: "010-1234-5678",
    partySize: 0,
    source: "form",
  });
  assert.equal(zeroParty.ok, false);
  assert.match(zeroParty.error, /인원은 1명에서 4명까지/);

  const overParty = await createBooking({
    slotId: "e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d",
    name: "홍길동",
    phone: "010-1234-5678",
    partySize: 5,
    source: "form",
  });
  assert.equal(overParty.ok, false);
  assert.match(overParty.error, /인원은 1명에서 4명까지/);
});

test("createBooking: 메모 길이 상한을 검증한다", async () => {
  const tooLongMemo = await createBooking({
    slotId: "e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d",
    name: "홍길동",
    phone: "010-1234-5678",
    partySize: 2,
    memo: "가".repeat(MEMO_MAX_LENGTH + 1),
    source: "form",
  });
  assert.equal(tooLongMemo.ok, false);
  assert.match(tooLongMemo.error, /메모는 200자 이내/);
});

test("createBooking: 예약 경로(source)는 form 또는 chat 만 허용한다", async () => {
  const invalidSource = await createBooking({
    slotId: "e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d",
    name: "홍길동",
    phone: "010-1234-5678",
    partySize: 2,
    source: "direct_api_bypass",
  });
  assert.equal(invalidSource.ok, false);
  assert.equal(invalidSource.error, "예약 경로가 올바르지 않습니다.");
});

test("lookupBookings: 예약번호와 전화번호 둘 다 필수다", async () => {
  const missingBoth = await lookupBookings({});
  assert.equal(missingBoth.ok, false);
  assert.equal(missingBoth.error, "예약번호와 전화번호를 모두 입력해주세요.");

  const missingPhone = await lookupBookings({ code: "GB-ABCDE" });
  assert.equal(missingPhone.ok, false);
  assert.equal(missingPhone.error, "예약번호와 전화번호를 모두 입력해주세요.");

  const missingCode = await lookupBookings({ phone: "010-1234-5678" });
  assert.equal(missingCode.ok, false);
  assert.equal(missingCode.error, "예약번호와 전화번호를 모두 입력해주세요.");

  const invalidPhone = await lookupBookings({ code: "GB-ABCDE", phone: "1234" });
  assert.equal(invalidPhone.ok, false);
  assert.equal(invalidPhone.error, "전화번호 형식이 올바르지 않습니다.");
});

test("listMyBookings: userId 가 없으면 빈 배열을 반환한다", async () => {
  const result = await listMyBookings(null);
  assert.deepEqual(result, []);

  const resultEmpty = await listMyBookings("");
  assert.deepEqual(resultEmpty, []);
});

function createFakeBookingSupabase({
  bookingsData = [],
  bookingsError = null,
  rpcHandler = null,
} = {}) {
  const eqCalls = [];
  const rpcCalls = [];

  const client = {
    _eqCalls: eqCalls,
    _rpcCalls: rpcCalls,
    from(table) {
      assert.equal(table, "bookings");
      return {
        select(fields) {
          assert.ok(typeof fields === "string");
          const queryBuilder = {
            eq(field, value) {
              eqCalls.push({ field, value });
              return queryBuilder;
            },
            limit(count) {
              assert.equal(count, 1);
              return Promise.resolve({ data: bookingsData, error: bookingsError });
            },
          };
          return queryBuilder;
        },
      };
    },
    async rpc(fnName, params) {
      rpcCalls.push({ fnName, params });
      if (rpcHandler) {
        return rpcHandler(fnName, params, rpcCalls.length);
      }
      return { data: null, error: null };
    },
  };
  return client;
}

test("lookupBookings: booking_code와 phone을 둘 다 .eq()로 조회하고 결과에서 name/phone을 배제한다", async () => {
  const mockBookingRow = {
    booking_code: "GB-ABCDE",
    party_size: 2,
    memo: "창가 자리",
    source: "form",
    created_at: "2026-09-04T10:00:00Z",
    name: "홍길동",
    phone: "010-1234-5678",
    slots: {
      date: "2026-09-10",
      time: "08:00:00",
      price: 150000,
      courses: {
        name: "한양CC",
        type: "field",
      },
    },
  };

  const successClient = createFakeBookingSupabase({
    bookingsData: [mockBookingRow],
  });

  const successResult = await lookupBookings(
    { code: "gb-abcde", phone: "010-1234-5678" },
    { client: successClient }
  );

  assert.equal(successResult.ok, true);
  assert.equal(successResult.bookings.length, 1);

  // Assert both predicates were queried
  assert.equal(successClient._eqCalls.length, 2);
  assert.deepEqual(successClient._eqCalls[0], {
    field: "booking_code",
    value: "GB-ABCDE",
  });
  assert.deepEqual(successClient._eqCalls[1], {
    field: "phone",
    value: "010-1234-5678",
  });

  // Assert PII exclusion
  const summary = successResult.bookings[0];
  assert.equal("name" in summary, false);
  assert.equal("phone" in summary, false);
  assert.equal(summary.bookingCode, "GB-ABCDE");
  assert.equal(summary.partySize, 2);
  assert.equal(summary.memo, "창가 자리");
  assert.equal(summary.courseName, "한양CC");

  // No-match case
  const noMatchClient = createFakeBookingSupabase({
    bookingsData: [],
  });
  const noMatchResult = await lookupBookings(
    { code: "GB-ABCDE", phone: "010-1234-5678" },
    { client: noMatchClient }
  );
  assert.equal(noMatchResult.ok, false);
  assert.equal(
    noMatchResult.error,
    "일치하는 예약이 없습니다. 예약번호와 전화번호를 확인해주세요."
  );
  assert.equal(noMatchClient._eqCalls.length, 2);
  assert.deepEqual(noMatchClient._eqCalls[0], {
    field: "booking_code",
    value: "GB-ABCDE",
  });
  assert.deepEqual(noMatchClient._eqCalls[1], {
    field: "phone",
    value: "010-1234-5678",
  });
});

test("normalizePhone: 10자리 및 11자리 번호의 다양한 입력 형식을 표준 정규화 형식으로 일치시킨다", async () => {
  const formats11 = ["01012345678", "010-1234-5678", "010.1234.5678"];
  for (const phone of formats11) {
    const client = createFakeBookingSupabase({ bookingsData: [] });
    await lookupBookings({ code: "GB-ABCDE", phone }, { client });
    const phonePredicate = client._eqCalls.find((c) => c.field === "phone");
    assert.ok(phonePredicate, `phone predicate missing for ${phone}`);
    assert.equal(
      phonePredicate.value,
      "010-1234-5678",
      `11자리 ${phone} 정규화 불일치`
    );
  }

  const formats10 = ["0111234567", "011-123-4567", "011.123.4567"];
  for (const phone of formats10) {
    const client = createFakeBookingSupabase({ bookingsData: [] });
    await lookupBookings({ code: "GB-ABCDE", phone }, { client });
    const phonePredicate = client._eqCalls.find((c) => c.field === "phone");
    assert.ok(phonePredicate, `phone predicate missing for ${phone}`);
    assert.equal(
      phonePredicate.value,
      "011-123-4567",
      `10자리 ${phone} 정규화 불일치`
    );
  }
});

test("createBooking: 정상 예약 생성 시 RPC 호출 인자 전달 및 반환값 camelCase 매핑을 보장한다", async () => {
  const mockRow = {
    id: "booking-uuid-1",
    booking_code: "GB-ABC12",
    slot_id: "e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d",
    name: "홍길동",
    phone: "010-1234-5678",
    party_size: 3,
    memo: "요청사항",
    source: "form",
    created_at: "2026-09-04T12:00:00Z",
  };

  const client = createFakeBookingSupabase({
    rpcHandler: (fnName) => {
      assert.equal(fnName, "create_booking");
      return { data: [mockRow], error: null };
    },
  });

  const result = await createBooking(
    {
      slotId: "e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d",
      name: " 홍길동 ",
      phone: "010-1234-5678",
      partySize: 3,
      memo: " 요청사항 ",
      source: "form",
      userId: "user-456",
    },
    { client }
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.booking, {
    id: "booking-uuid-1",
    bookingCode: "GB-ABC12",
    slotId: "e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d",
    name: "홍길동",
    phone: "010-1234-5678",
    partySize: 3,
    memo: "요청사항",
    source: "form",
    createdAt: "2026-09-04T12:00:00Z",
  });

  assert.equal(client._rpcCalls.length, 1);
  const rpcCall = client._rpcCalls[0];
  assert.equal(rpcCall.params.p_slot_id, "e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d");
  assert.equal(rpcCall.params.p_name, "홍길동");
  assert.equal(rpcCall.params.p_phone, "010-1234-5678");
  assert.equal(rpcCall.params.p_party_size, 3);
  assert.equal(rpcCall.params.p_memo, "요청사항");
  assert.equal(rpcCall.params.p_source, "form");
  assert.equal(rpcCall.params.p_user_id, "user-456");
  assert.match(rpcCall.params.p_booking_code, /^GB-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/);

  // Test source passthrough for chat
  const chatClient = createFakeBookingSupabase({
    rpcHandler: () => ({
      data: [{ ...mockRow, source: "chat" }],
      error: null,
    }),
  });
  const chatResult = await createBooking(
    {
      slotId: "e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d",
      name: "홍길동",
      phone: "010-1234-5678",
      partySize: 2,
      source: "chat",
    },
    { client: chatClient }
  );
  assert.equal(chatResult.ok, true);
  assert.equal(chatResult.booking.source, "chat");
  assert.equal(chatClient._rpcCalls[0].params.p_source, "chat");
});

test("toKoreanError: RPC 에러 코드별 한국어 메시지 매핑 및 미식별 에러 시 DB 원본 메시지 은닉을 검증한다", async () => {
  const errorCases = [
    {
      dbMessage: "ERROR: CAPACITY_EXCEEDED remaining seats insufficient",
      expected: "선택하신 시간의 남은 자리가 부족합니다. 다른 시간을 골라주세요.",
    },
    {
      dbMessage: "ERROR: SLOT_NOT_FOUND slot id does not exist",
      expected: "선택하신 시간을 찾을 수 없습니다. 목록에서 다시 선택해주세요.",
    },
    {
      dbMessage: "ERROR: INVALID_PARTY_SIZE party size out of bounds",
      expected: "인원 수가 올바르지 않습니다.",
    },
    {
      dbMessage: "ERROR: MISSING_NAME name is required",
      expected: "이름을 입력해주세요.",
    },
    {
      dbMessage: "ERROR: MISSING_PHONE phone is required",
      expected: "전화번호를 입력해주세요.",
    },
  ];

  for (const { dbMessage, expected } of errorCases) {
    const client = createFakeBookingSupabase({
      rpcHandler: () => ({
        data: null,
        error: { message: dbMessage },
      }),
    });
    const result = await createBooking(
      {
        slotId: "e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d",
        name: "홍길동",
        phone: "010-1234-5678",
        partySize: 2,
        source: "form",
      },
      { client }
    );
    assert.equal(result.ok, false);
    assert.equal(result.error, expected);
  }

  // Unrecognized DB error: must not leak raw schema/table/column names
  const rawDbMessage =
    "duplicate key value violates unique constraint bookings_pkey on table bookings column id";
  const clientGeneric = createFakeBookingSupabase({
    rpcHandler: () => ({
      data: null,
      error: { message: rawDbMessage },
    }),
  });
  const genericResult = await createBooking(
    {
      slotId: "e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d",
      name: "홍길동",
      phone: "010-1234-5678",
      partySize: 2,
      source: "form",
    },
    { client: clientGeneric }
  );

  assert.equal(genericResult.ok, false);
  assert.equal(
    genericResult.error,
    "예약을 처리하지 못했습니다. 잠시 후 다시 시도해주세요."
  );
  assert.equal(genericResult.error.includes("duplicate key"), false);
  assert.equal(genericResult.error.includes("bookings"), false);
  assert.equal(genericResult.error.includes("column id"), false);
});

test("createBooking: 예약번호 충돌(23505) 발생 시 재시도하고, 한도 초과 시 에러를 반환한다", async () => {
  const mockRow = {
    id: "booking-uuid-retry",
    booking_code: "GB-RETR3",
    slot_id: "e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d",
    name: "홍길동",
    phone: "010-1234-5678",
    party_size: 2,
    source: "form",
    created_at: "2026-09-04T12:00:00Z",
  };

  // Case 1: 2 collisions then success on 3rd attempt
  let attempts = 0;
  const retrySuccessClient = createFakeBookingSupabase({
    rpcHandler: () => {
      attempts += 1;
      if (attempts < 3) {
        return {
          data: null,
          error: {
            code: "23505",
            message: "duplicate key value violates unique constraint booking_code",
          },
        };
      }
      return { data: [mockRow], error: null };
    },
  });

  const retryResult = await createBooking(
    {
      slotId: "e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d",
      name: "홍길동",
      phone: "010-1234-5678",
      partySize: 2,
      source: "form",
    },
    { client: retrySuccessClient }
  );

  assert.equal(retryResult.ok, true);
  assert.equal(attempts, 3);
  assert.equal(retrySuccessClient._rpcCalls.length, 3);
  // Ensure each retry generated a booking code
  const codes = retrySuccessClient._rpcCalls.map((c) => c.params.p_booking_code);
  assert.equal(codes.length, 3);

  // Case 2: Always collide -> reaches CODE_RETRY_LIMIT (5)
  let limitAttempts = 0;
  const alwaysCollideClient = createFakeBookingSupabase({
    rpcHandler: () => {
      limitAttempts += 1;
      return {
        data: null,
        error: {
          code: "23505",
          message: "duplicate key value violates unique constraint booking_code",
        },
      };
    },
  });

  const limitResult = await createBooking(
    {
      slotId: "e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d",
      name: "홍길동",
      phone: "010-1234-5678",
      partySize: 2,
      source: "form",
    },
    { client: alwaysCollideClient }
  );

  assert.equal(limitResult.ok, false);
  assert.equal(limitAttempts, 5);
  assert.equal(alwaysCollideClient._rpcCalls.length, 5);
  assert.equal(
    limitResult.error,
    "예약번호 발급에 실패했습니다. 다시 시도해주세요."
  );
});

test("isValidSlotId: 올바른 UUID를 통과시키고 비정상 입력을 거절한다", () => {
  assert.equal(isValidSlotId("e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d"), true);
  assert.equal(isValidSlotId("E9F0D14B-2F3A-4A5C-9C7D-8E9F0A1B2C3D"), true);
  assert.equal(isValidSlotId("invalid-uuid"), false);
  assert.equal(isValidSlotId(""), false);
  assert.equal(isValidSlotId(null), false);
  assert.equal(isValidSlotId(undefined), false);
  assert.equal(isValidSlotId(12345), false);
  assert.equal(isValidSlotId("../../../etc/passwd"), false);
  assert.equal(isValidSlotId("' OR '1'='1"), false);
});

test("getSlot: 정상 슬롯과 코스 정보를 매핑하고 available을 계산한다", async () => {
  const fakeClient = createFakeSupabase({
    data: {
      id: "e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d",
      date: "2026-09-10",
      time: "08:00:00",
      price: 150000,
      capacity: 4,
      booked: 1,
      courses: {
        id: "c1",
        name: "한양CC",
        type: "field",
      },
    },
  });

  const slot = await getSlot("e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d", { client: fakeClient });
  assert.equal(slot.id, "e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d");
  assert.equal(slot.date, "2026-09-10");
  assert.equal(slot.time, "08:00:00");
  assert.equal(slot.price, 150000);
  assert.equal(slot.capacity, 4);
  assert.equal(slot.booked, 1);
  assert.equal(slot.available, 3);
  assert.deepEqual(slot.course, {
    id: "c1",
    name: "한양CC",
    type: "field",
  });
});

test("getSlot: courses가 배열로 반환되어도 첫 번째 코스 요약으로 안전하게 매핑한다", async () => {
  const fakeClient = createFakeSupabase({
    data: {
      id: "e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d",
      date: "2026-09-10",
      time: "08:00:00",
      price: 150000,
      capacity: 4,
      booked: 2,
      courses: [{ id: "c1", name: "한양CC", type: "field" }],
    },
  });

  const slot = await getSlot("e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d", { client: fakeClient });
  assert.deepEqual(slot.course, {
    id: "c1",
    name: "한양CC",
    type: "field",
  });
  assert.equal(slot.available, 2);
});

test("getSlot: capacity와 booked 값에 따라 available(남은 자리)을 정확히 계산한다", async () => {
  const fullClient = createFakeSupabase({
    data: {
      id: "e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d",
      date: "2026-09-10",
      time: "08:00:00",
      price: 150000,
      capacity: 4,
      booked: 4,
      courses: { id: "c1", name: "한양CC", type: "field" },
    },
  });
  const fullSlot = await getSlot("e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d", { client: fullClient });
  assert.equal(fullSlot.available, 0);

  const emptyClient = createFakeSupabase({
    data: {
      id: "e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d",
      date: "2026-09-10",
      time: "08:00:00",
      price: 150000,
      capacity: 4,
      booked: 0,
      courses: { id: "c1", name: "한양CC", type: "field" },
    },
  });
  const emptySlot = await getSlot("e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d", { client: emptyClient });
  assert.equal(emptySlot.available, 4);
});

test("getSlot: 데이터가 없으면 null을 반환한다", async () => {
  const notFoundClient = createFakeSupabase({ data: null });
  const result = await getSlot("e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d", { client: notFoundClient });
  assert.equal(result, null);

  assert.equal(await getSlot(null, { client: notFoundClient }), null);
  assert.equal(await getSlot("", { client: notFoundClient }), null);
});

test("getSlot: Supabase 에러 발생 시 예외를 던진다", async () => {
  const errorClient = createFakeSupabase({
    error: new Error("Postgres query failed"),
  });
  await assert.rejects(
    () => getSlot("e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d", { client: errorClient }),
    /Postgres query failed/
  );
});

test("GET /api/slots/:slotId: 잘못된 UUID 요청에 400 상태코드와 에러를 반환한다", async () => {
  const handler = createGetSlotHandler();
  const req = new Request("http://localhost/api/slots/not-a-valid-uuid");
  const res = await handler(req, {
    params: Promise.resolve({ slotId: "not-a-valid-uuid" }),
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.ok, false);
  assert.equal(data.error, "유효하지 않은 슬롯 ID입니다.");
});

test("GET /api/slots/:slotId: 존재하지 않는 슬롯 조회 시 404를 반환한다", async () => {
  const handler = createGetSlotHandler({
    getSlotFn: async () => null,
  });
  const validId = "e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d";
  const req = new Request(`http://localhost/api/slots/${validId}`);
  const res = await handler(req, {
    params: Promise.resolve({ slotId: validId }),
  });

  assert.equal(res.status, 404);
  const data = await res.json();
  assert.equal(data.ok, false);
  assert.equal(data.error, "선택하신 시간을 찾을 수 없습니다.");
});

test("GET /api/slots/:slotId: 슬롯 조회 성공 시 200과 UI에 필요한 요약 정보만 반환한다", async () => {
  const mockSlot = {
    id: "e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d",
    date: "2026-09-10",
    time: "08:00:00",
    price: 150000,
    capacity: 4,
    booked: 1,
    available: 3,
    course: {
      id: "c1",
      name: "한양CC",
      type: "field",
    },
  };

  const handler = createGetSlotHandler({
    getSlotFn: async () => mockSlot,
  });

  const req = new Request(`http://localhost/api/slots/${mockSlot.id}`);
  const res = await handler(req, {
    params: Promise.resolve({ slotId: mockSlot.id }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.deepEqual(data.slot, mockSlot);
  assert.deepEqual(data.course, {
    id: "c1",
    name: "한양CC",
    type: "field",
  });
});

test("GET /api/slots/:slotId: DB 실패 시 500 상태코드와 사용자 친화적 에러를 반환한다", async () => {
  const handler = createGetSlotHandler({
    getSlotFn: async () => {
      throw new Error("Internal database timeout");
    },
  });

  const validId = "e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d";
  const req = new Request(`http://localhost/api/slots/${validId}`);
  const res = await handler(req, {
    params: Promise.resolve({ slotId: validId }),
  });

  assert.equal(res.status, 500);
  const data = await res.json();
  assert.equal(data.ok, false);
  assert.equal(data.error, "슬롯 정보를 불러오지 못했습니다.");
});

test(
  "실제 Supabase 스모크 테스트 (환경변수 설정 시에만 수동/배포 QA용으로 실행)",
  {
    skip: !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL,
  },
  async () => {
    const result = await getSlot("00000000-0000-0000-0000-000000000000");
    assert.equal(result, null);
  }
);
