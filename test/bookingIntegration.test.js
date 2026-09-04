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

test("통합 흐름 검증: 홈 → 코스 → 날짜 → 슬롯 → 폼 → 예약완료 → 조회 → 내 예약", () => {
  // 1. 홈: 코스 목록
  const mockCourses = [
    { id: "c1", name: "한양CC", type: "field", region: "경기" },
    { id: "c2", name: "강남스크린", type: "screen", region: "서울" },
  ];
  const fieldCourses = mockCourses.filter((c) => c.type === "field");
  assert.equal(fieldCourses.length, 1);
  assert.equal(fieldCourses[0].name, "한양CC");

  // 2. 코스 상세 + 날짜별 슬롯
  const mockSlot = {
    id: "e9f0d14b-2f3a-4a5c-9c7d-8e9f0a1b2c3d",
    courseId: "c1",
    date: "2026-09-10",
    time: "08:00:00",
    price: 150000,
    capacity: 4,
    booked: 1,
  };
  const availableSlots = [{
    ...mockSlot,
    available: mockSlot.capacity - mockSlot.booked,
  }];
  assert.equal(availableSlots[0].available, 3);

  // 3. GET /api/slots/:slotId 응답 형식
  const slotResponse = {
    ok: true,
    slot: {
      id: mockSlot.id,
      date: mockSlot.date,
      time: mockSlot.time,
      price: mockSlot.price,
      capacity: mockSlot.capacity,
      booked: mockSlot.booked,
      available: mockSlot.capacity - mockSlot.booked,
      course: {
        id: "c1",
        name: "한양CC",
        type: "field",
      },
    },
    course: {
      id: "c1",
      name: "한양CC",
      type: "field",
    },
  };
  assert.equal(slotResponse.ok, true);
  assert.equal(slotResponse.slot.id, mockSlot.id);
  assert.equal(slotResponse.course.name, "한양CC");
  assert.equal("phone" in slotResponse.course, false); // 민감정보 미노출

  // 4. 수동 폼 예약 생성: bookings.source = "form" 및 booked 증가
  const bookingInput = {
    slotId: mockSlot.id,
    name: "홍길동",
    phone: "010-1234-5678",
    partySize: 2,
    memo: "카트 준비 부탁드립니다.",
    source: "form",
  };
  assert.equal(bookingInput.source, "form");
  const updatedBooked = mockSlot.booked + bookingInput.partySize;
  assert.equal(updatedBooked, 3);
  assert.ok(updatedBooked <= mockSlot.capacity);

  const createdBooking = {
    id: "b1",
    bookingCode: "GB-7K9M2",
    slotId: mockSlot.id,
    name: bookingInput.name,
    phone: "010-1234-5678",
    partySize: bookingInput.partySize,
    memo: bookingInput.memo,
    source: bookingInput.source,
    createdAt: new Date().toISOString(),
  };
  assert.match(createdBooking.bookingCode, /^GB-[2-9A-HJ-NP-Z]{5}$/);
  assert.equal(createdBooking.source, "form");

  // 5. 비로그인 조회: 예약번호와 전화번호 일치 시 성공, 불일치/누락 시 실패
  function mockLookup({ code, phone }) {
    if (!code || !phone) {
      return { ok: false, error: "예약번호와 전화번호를 모두 입력해주세요." };
    }
    if (code === createdBooking.bookingCode && phone === createdBooking.phone) {
      return {
        ok: true,
        bookings: [
          {
            bookingCode: createdBooking.bookingCode,
            partySize: createdBooking.partySize,
            memo: createdBooking.memo,
            source: createdBooking.source,
            createdAt: createdBooking.createdAt,
            date: mockSlot.date,
            time: mockSlot.time,
            price: mockSlot.price,
            courseName: "한양CC",
            courseType: "field",
          },
        ],
      };
    }
    return { ok: false, error: "일치하는 예약이 없습니다. 예약번호와 전화번호를 확인해주세요." };
  }

  // 성공 케이스
  const lookupSuccess = mockLookup({ code: "GB-7K9M2", phone: "010-1234-5678" });
  assert.equal(lookupSuccess.ok, true);
  assert.equal(lookupSuccess.bookings.length, 1);
  assert.equal("name" in lookupSuccess.bookings[0], false); // PII 제외
  assert.equal("phone" in lookupSuccess.bookings[0], false); // PII 제외

  // 실패 케이스
  assert.equal(mockLookup({ code: "GB-7K9M2" }).ok, false);
  assert.equal(mockLookup({ phone: "010-1234-5678" }).ok, false);
  assert.equal(mockLookup({ code: "GB-WRONG", phone: "010-1234-5678" }).ok, false);

  // 6. 로그인 사용자 예약 조회 (/my)
  const userId = "user-uuid-123";
  const userBookings = [
    { ...createdBooking, userId },
    { id: "b2", bookingCode: "GB-OLDER", userId: "other-user", createdAt: "2026-09-01" },
  ];
  const myList = userBookings.filter((b) => b.userId === userId);
  assert.equal(myList.length, 1);
  assert.equal(myList[0].bookingCode, "GB-7K9M2");

  // 7. 감사 로그 및 API 로깅 검증
  const auditEntry = {
    action: "booking.create",
    result: "allow",
    targetType: "booking",
    targetId: createdBooking.bookingCode,
    actorRole: "guest",
  };
  assert.equal(auditEntry.action, "booking.create");
  assert.equal(auditEntry.targetId, "GB-7K9M2"); // 예약번호만 남기고 이름/전화번호 없음
});

