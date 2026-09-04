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
import { createGetSlotHandler } from "../app/api/slots/[slotId]/route.js";

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

  const slot = await getSlot("e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d", fakeClient);
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

  const slot = await getSlot("e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d", fakeClient);
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
  const fullSlot = await getSlot("e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d", fullClient);
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
  const emptySlot = await getSlot("e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d", emptyClient);
  assert.equal(emptySlot.available, 4);
});

test("getSlot: 데이터가 없으면 null을 반환한다", async () => {
  const notFoundClient = createFakeSupabase({ data: null });
  const result = await getSlot("e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d", notFoundClient);
  assert.equal(result, null);

  assert.equal(await getSlot(null, notFoundClient), null);
  assert.equal(await getSlot("", notFoundClient), null);
});

test("getSlot: Supabase 에러 발생 시 예외를 던진다", async () => {
  const errorClient = createFakeSupabase({
    error: new Error("Postgres query failed"),
  });
  await assert.rejects(
    () => getSlot("e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d", errorClient),
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
