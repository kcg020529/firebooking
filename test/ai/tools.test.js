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
        return { bookingCode: "BK-1234", phone: "010-1234-5678" };
      },
    },
  );

  assert.equal(receivedInput.source, "chat");
  assert.deepEqual(result, { ok: true, bookingCode: "BK-1234" });
});

test("예약 조회에는 세션 소유권 문맥이 반드시 필요하다", async () => {
  const toolCall = { name: "lookup_booking", input: { code: "BK-1234" } };
  const dependencies = { lookupBooking: async () => [] };

  assert.equal((await executeToolCall(toolCall, dependencies)).ok, false);
  assert.equal(
    (
      await executeToolCall(toolCall, dependencies, {
        sessionId: "session-1",
      })
    ).ok,
    true,
  );
});

test("예약 조회 결과에서 개인정보 필드를 제거한다", async () => {
  const result = await executeToolCall(
    { name: "lookup_booking", input: { code: "BK-1234" } },
    {
      lookupBooking: async () => [
        {
          bookingCode: "BK-1234",
          course: "한강 골프장",
          date: "2026-09-03",
          time: "10:00",
          name: "홍길동",
          phone: "010-1234-5678",
        },
      ],
    },
    { sessionId: "session-1" },
  );

  assert.deepEqual(result, {
    ok: true,
    bookings: [
      {
        bookingCode: "BK-1234",
        course: "한강 골프장",
        date: "2026-09-03",
        time: "10:00",
      },
    ],
  });
});
