import test from "node:test";
import assert from "node:assert/strict";

import {
  MIN_PARTY_SIZE,
  MAX_PARTY_SIZE,
  NAME_MAX_LENGTH,
  MEMO_MAX_LENGTH,
} from "../lib/bookingLimits.js";
import { createBooking, lookupBookings, listMyBookings } from "../lib/bookings.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

test("slotId UUID 검증 로직이 비정상 입력을 거절한다", () => {
  assert.equal(UUID_PATTERN.test("e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d"), true);
  assert.equal(UUID_PATTERN.test("invalid-uuid"), false);
  assert.equal(UUID_PATTERN.test(""), false);
  assert.equal(UUID_PATTERN.test("../../../etc/passwd"), false);
  assert.equal(UUID_PATTERN.test("' OR '1'='1"), false);
});
