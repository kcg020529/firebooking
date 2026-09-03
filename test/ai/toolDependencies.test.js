import test from "node:test";
import assert from "node:assert/strict";

import { createChatToolDependencies } from "../../lib/ai/toolDependencies.js";

const COURSES = [
  { id: "course-1", name: "한강 골프장", type: "field", region: "서울" },
  { id: "course-2", name: "도심 스크린", type: "screen", region: "서울" },
];

function createGetCourse() {
  return async (id, { date }) => {
    const course = COURSES.find((item) => item.id === id);
    if (!course) return null;
    return {
      ...course,
      slots: date
        ? [
            {
              id: `${id}-slot-1`,
              date,
              time: "10:00",
              price: 50000,
              capacity: 4,
              available: id === "course-1" ? 3 : 1,
            },
          ]
        : [],
    };
  };
}

test("날짜가 없으면 골프장 후보만 반환한다", async () => {
  const dependencies = createChatToolDependencies({
    listCoursesFn: async () => COURSES,
    getCourseFn: createGetCourse(),
  });

  const result = await dependencies.searchSlots({ type: "field" });

  assert.equal(result.courses.length, 2);
  assert.deepEqual(result.slots, []);
  assert.equal("phone" in result.courses[0], false);
});

test("요청 인원을 수용할 수 있는 슬롯만 반환한다", async () => {
  const dependencies = createChatToolDependencies({
    listCoursesFn: async () => COURSES,
    getCourseFn: createGetCourse(),
  });

  const result = await dependencies.searchSlots({
    date: "2026-09-04",
    partySize: 2,
  });

  assert.deepEqual(result.slots.map(({ id }) => id), ["course-1-slot-1"]);
});

test("예약 결과 콜백에는 실행 결과를 전달한다", async () => {
  let callbackEntry;
  const dependencies = createChatToolDependencies({
    createBookingFn: async () => ({
      ok: true,
      booking: { bookingCode: "GB-ABCDE" },
    }),
    onBookingResult: async (entry) => {
      callbackEntry = entry;
    },
  });

  const result = await dependencies.createBooking({
    slotId: "slot-1",
    source: "chat",
  });

  assert.equal(result.booking.bookingCode, "GB-ABCDE");
  assert.equal(callbackEntry.input.slotId, "slot-1");
});

test("감사 콜백 실패가 성공한 예약 결과를 바꾸지 않는다", async () => {
  const dependencies = createChatToolDependencies({
    createBookingFn: async () => ({
      ok: true,
      booking: { bookingCode: "GB-SAFE1" },
    }),
    onBookingResult: async () => {
      throw new Error("audit unavailable");
    },
  });

  const result = await dependencies.createBooking({ slotId: "slot-1" });

  assert.equal(result.ok, true);
  assert.equal(result.booking.bookingCode, "GB-SAFE1");
});

test("예약 조회는 공용 조회 함수와 결과 콜백을 함께 사용한다", async () => {
  let lookupInput;
  let callbackEntry;
  const dependencies = createChatToolDependencies({
    lookupBookingFn: async (input) => {
      lookupInput = input;
      return { ok: true, bookings: [{ bookingCode: "GB-ABCDE" }] };
    },
    onLookupResult: async (entry) => {
      callbackEntry = entry;
    },
  });

  const input = { code: "GB-ABCDE", phone: "010-1234-5678" };
  const result = await dependencies.lookupBooking(input);

  assert.deepEqual(lookupInput, input);
  assert.equal(result.ok, true);
  assert.equal(callbackEntry.result.bookings[0].bookingCode, "GB-ABCDE");
});
