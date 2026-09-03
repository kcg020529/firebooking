import test from "node:test";
import assert from "node:assert/strict";

import {
  executeToolCall,
  validateToolCall,
} from "../../lib/ai/tools.js";

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
