import test from "node:test";
import assert from "node:assert/strict";

import {
  executeToolCall,
  validateToolCall,
} from "../../lib/ai/tools.js";

test("search_slots는 골프장 이름 입력을 허용한다", () => {
  assert.equal(validateToolCall("search_slots", {
    courseName: "그린힐 컨트리클럽", date: "2026-09-16", partySize: 2,
  }).ok, true);
});

test("명시적 동의가 없으면 예약 생성 함수를 호출하지 않는다", async () => {
  let createCalls = 0;
  const result = await executeToolCall(
    { name: "create_booking", input: { slotId: "slot-1", name: "테스터", phone: "010-1111-1111", partySize: 2 } },
    { createBooking: async () => { createCalls += 1; return { ok: true }; } },
    { allowBookingCreation: false, knownSlotIds: new Set(["slot-1"]) },
  );
  assert.equal(result.ok, false);
  assert.match(result.error, /명시적인 진행 동의/);
  assert.equal(createCalls, 0);
});

test("비로그인 사용자의 예약 생성은 서버에서 차단한다", async () => {
  let createCalls = 0;
  const result = await executeToolCall(
    { name: "create_booking", input: { slotId: "slot-1", name: "테스터", phone: "010-1111-1111", partySize: 2 } },
    { createBooking: async () => { createCalls += 1; return { ok: true }; } },
    { actorId: null, allowBookingCreation: true, knownSlotIds: new Set(["slot-1"]) },
  );
  assert.equal(result.ok, false);
  assert.equal(result.loginRequired, true);
  assert.match(result.error, /로그인/);
  assert.equal(createCalls, 0);
});

test("알 수 없는 tool과 추가 인자를 거절한다", () => {
  assert.equal(validateToolCall("drop_database", {}).ok, false);
  assert.equal(
    validateToolCall("search_slots", { date: "2026-09-03", admin: true }).ok,
    false,
  );
});

test("create_booking 필수값과 형식을 검증한다", () => {
  assert.equal(
    validateToolCall("create_booking", {
      slotId: "slot-1",
      name: "홍길동",
      phone: "010-1234-5678",
      partySize: 3,
    }).ok,
    true,
  );
  assert.equal(
    validateToolCall("create_booking", {
      slotId: "slot-1",
      name: "홍길동",
      phone: "잘못된 번호",
      partySize: 9,
    }).ok,
    false,
  );
});

test("예약 생성은 source를 chat으로 강제하고 결과를 제한한다", async () => {
  let receivedInput;
  const result = await executeToolCall(
    {
      name: "create_booking",
      input: {
        slotId: "slot-1",
        name: "홍길동",
        phone: "010-1234-5678",
        partySize: 3,
      },
    },
    {
      createBooking: async (input) => {
        receivedInput = input;
        return {
          ok: true,
          booking: {
            bookingCode: "BK-1234",
            phone: "010-1234-5678",
          },
        };
      },
    },
  );

  assert.equal(receivedInput.source, "chat");
  assert.deepEqual(result, { ok: true, bookingCode: "BK-1234" });
});

test("createBooking 실패를 tool 성공으로 포장하지 않는다", async () => {
  const result = await executeToolCall(
    {
      name: "create_booking",
      input: {
        slotId: "slot-1",
        name: "홍길동",
        phone: "010-1234-5678",
        partySize: 3,
      },
    },
    {
      createBooking: async () => ({
        ok: false,
        error: "남은 자리가 부족합니다.",
      }),
    },
  );

  assert.deepEqual(result, {
    ok: false,
    error: "남은 자리가 부족합니다.",
  });
});

test("같은 응답에서 search_slots로 받지 않은 slotId로는 예약하지 않는다", async () => {
  const knownSlotIds = new Set();
  let createCalls = 0;
  const dependencies = {
    searchSlots: async () => ({
      courses: [],
      slots: [{ id: "slot-real", date: "2026-09-16", time: "10:00" }],
    }),
    createBooking: async () => {
      createCalls += 1;
      return { ok: true, booking: { bookingCode: "GB-TEST1" } };
    },
  };
  const booking = (slotId) => ({
    name: "create_booking",
    input: { slotId, name: "홍길동", phone: "010-1234-5678", partySize: 4 },
  });

  const guessed = await executeToolCall(booking("slot_guessed_1000"), dependencies, { knownSlotIds });
  assert.equal(guessed.ok, false);
  assert.equal(createCalls, 0);

  await executeToolCall(
    { name: "search_slots", input: { date: "2026-09-16", partySize: 4 } },
    dependencies,
    { knownSlotIds },
  );
  const result = await executeToolCall(booking("slot-real"), dependencies, { knownSlotIds });

  assert.deepEqual(result, { ok: true, bookingCode: "GB-TEST1" });
  assert.equal(createCalls, 1);
});

test("예약 조회에는 예약번호와 전화번호가 모두 필요하다", async () => {
  const invalidToolCall = { name: "lookup_booking", input: { code: "BK-1234" } };
  const toolCall = {
    name: "lookup_booking",
    input: { code: "BK-1234", phone: "010-1234-5678" },
  };
  const dependencies = {
    lookupBooking: async () => ({ ok: true, bookings: [] }),
  };

  assert.equal((await executeToolCall(invalidToolCall, dependencies)).ok, false);
  assert.equal((await executeToolCall(toolCall, dependencies)).ok, true);
});

test("예약 조회 결과에서 개인정보 필드를 제거한다", async () => {
  const result = await executeToolCall(
    {
      name: "lookup_booking",
      input: { code: "BK-1234", phone: "010-1234-5678" },
    },
    {
      lookupBooking: async () => ({
        ok: true,
        bookings: [
          {
            bookingCode: "BK-1234",
            courseName: "한강 골프장",
            courseType: "field",
            date: "2026-09-03",
            time: "10:00",
            partySize: 2,
            memo: "연락처 010-9999-8888",
            name: "홍길동",
            phone: "010-1234-5678",
          },
        ],
      }),
    },
  );

  assert.deepEqual(result, {
    ok: true,
    bookings: [
      {
        bookingCode: "BK-1234",
        courseName: "한강 골프장",
        courseType: "field",
        date: "2026-09-03",
        time: "10:00",
        partySize: 2,
      },
    ],
  });
});
