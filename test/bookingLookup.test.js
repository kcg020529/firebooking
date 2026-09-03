import test from "node:test";
import assert from "node:assert/strict";

import { lookupOwnBookings } from "../lib/bookingLookup.js";

function createQuery(result) {
  const calls = [];
  const query = {
    select() {
      calls.push(["select"]);
      return query;
    },
    eq(column, value) {
      calls.push(["eq", column, value]);
      return query;
    },
    limit(value) {
      calls.push(["limit", value]);
      return query;
    },
    then(resolve) {
      return Promise.resolve(result).then(resolve);
    },
  };

  return { query, calls };
}

test("인증 사용자 ID가 없으면 DB를 조회하지 않는다", async () => {
  let clientCreated = false;
  const result = await lookupOwnBookings(
    { code: "GB-ABCDE" },
    { actorId: null },
    () => {
      clientCreated = true;
    },
  );

  assert.equal(result.ok, false);
  assert.equal(clientCreated, false);
});

test("service-role 조회에 user_id 소유자 조건을 강제한다", async () => {
  const { query, calls } = createQuery({
    data: [
      {
        booking_code: "GB-ABCDE",
        slots: {
          date: "2026-09-04",
          time: "10:00",
          courses: { name: "한강 골프장" },
        },
      },
    ],
    error: null,
  });
  const result = await lookupOwnBookings(
    { code: "GB-ABCDE" },
    { actorId: "actor-1" },
    () => ({ from: () => query }),
  );

  assert.ok(
    calls.some(
      ([method, column, value]) =>
        method === "eq" && column === "user_id" && value === "actor-1",
    ),
  );
  assert.deepEqual(result.bookings, [
    {
      bookingCode: "GB-ABCDE",
      course: "한강 골프장",
      date: "2026-09-04",
      time: "10:00",
    },
  ]);
});
