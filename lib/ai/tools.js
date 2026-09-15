const TOOL_ERROR = Object.freeze({
  LOGIN_REQUIRED: "예약하려면 로그인이 필요합니다. 로그인 후 다시 진행해주세요.",
  CONFIRMATION_REQUIRED: "예약 생성 전 사용자의 명시적인 진행 동의가 필요합니다.",
  UNKNOWN: "허용되지 않은 도구예요.",
  INVALID_INPUT: "도구 입력값이 올바르지 않아요.",
  UNAVAILABLE: "현재 이 기능을 사용할 수 없어요.",
  UNKNOWN_SLOT: "search_slots 결과에 있는 slot id로만 예약할 수 있어요. 예약 직전에 search_slots를 다시 호출하세요.",
});

export const CHAT_TOOLS = Object.freeze([
  {
    name: "search_slots",
    description: "조건에 맞는 골프장과 예약 가능한 시간대를 검색한다.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        type: { type: "string", enum: ["field", "screen"] },
        courseId: { type: "string" },
        courseName: { type: "string" },
        date: { type: "string", description: "YYYY-MM-DD" },
        partySize: { type: "integer", minimum: 1, maximum: 4 },
      },
    },
  },
  {
    name: "create_booking",
    description: "선택한 시간대에 예약을 생성한다.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["slotId", "name", "phone", "partySize"],
      properties: {
        slotId: { type: "string" },
        name: { type: "string" },
        phone: { type: "string" },
        partySize: { type: "integer", minimum: 1, maximum: 4 },
        memo: { type: "string" },
      },
    },
  },
  {
    name: "lookup_booking",
    description: "예약번호와 전화번호가 모두 일치하는 예약만 조회한다.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["code", "phone"],
      properties: {
        code: { type: "string" },
        phone: { type: "string" },
      },
    },
  },
]);

const TOOL_NAMES = new Set(CHAT_TOOLS.map(({ name }) => name));
const PHONE_RE = /^01[016789][-. ]?\d{3,4}[-. ]?\d{4}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

function hasOnlyKeys(input, allowedKeys) {
  return Object.keys(input).every((key) => allowedKeys.includes(key));
}

function isNonEmptyString(value, maxLength = 100) {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maxLength
  );
}

function isPartySize(value) {
  return Number.isInteger(value) && value >= 1 && value <= 4;
}

function validateSearchSlots(input) {
  if (!hasOnlyKeys(input, ["type", "courseId", "courseName", "date", "partySize"])) {
    return false;
  }

  return (
    (input.type === undefined || ["field", "screen"].includes(input.type)) &&
    (input.courseId === undefined || isNonEmptyString(input.courseId, 100)) &&
    (input.courseName === undefined || isNonEmptyString(input.courseName, 100)) &&
    (input.date === undefined || DATE_RE.test(input.date)) &&
    (input.partySize === undefined || isPartySize(input.partySize))
  );
}

function validateCreateBooking(input) {
  if (!hasOnlyKeys(input, ["slotId", "name", "phone", "partySize", "memo"])) {
    return false;
  }

  return (
    isNonEmptyString(input.slotId, 100) &&
    isNonEmptyString(input.name, 50) &&
    typeof input.phone === "string" &&
    PHONE_RE.test(input.phone) &&
    isPartySize(input.partySize) &&
    (input.memo === undefined ||
      (typeof input.memo === "string" && input.memo.length <= 200))
  );
}

function validateLookupBooking(input) {
  if (!hasOnlyKeys(input, ["code", "phone"])) {
    return false;
  }

  return (
    isNonEmptyString(input.code, 32) &&
    typeof input.phone === "string" &&
    PHONE_RE.test(input.phone)
  );
}

const TOOL_VALIDATORS = Object.freeze({
  search_slots: validateSearchSlots,
  create_booking: validateCreateBooking,
  lookup_booking: validateLookupBooking,
});

export function validateToolCall(name, input) {
  if (!TOOL_NAMES.has(name)) {
    return { ok: false, error: TOOL_ERROR.UNKNOWN };
  }

  if (!isPlainObject(input) || !TOOL_VALIDATORS[name](input)) {
    return { ok: false, error: TOOL_ERROR.INVALID_INPUT };
  }

  return { ok: true };
}

function pick(value, keys) {
  if (!isPlainObject(value)) {
    return {};
  }

  return Object.fromEntries(
    keys.filter((key) => value[key] !== undefined).map((key) => [key, value[key]]),
  );
}

function shapeSearchResult(result) {
  const courses = Array.isArray(result?.courses) ? result.courses : [];
  const slots = Array.isArray(result) ? result : result?.slots;

  return {
    courses: courses.slice(0, 20).map((item) =>
      pick(item, ["courseId", "courseName", "type", "region"]),
    ),
    slots: Array.isArray(slots)
      ? slots.slice(0, 20).map((item) =>
          pick(item, [
            "id",
            "courseId",
            "courseName",
            "type",
            "region",
            "date",
            "time",
            "price",
            "capacity",
            "available",
          ]),
        )
      : [],
  };
}

function shapeBookingResult(result) {
  const bookingCode = result?.bookingCode ?? result?.booking?.bookingCode;
  return isNonEmptyString(bookingCode, 32) ? { bookingCode } : {};
}

function shapeLookupResult(result) {
  const items = Array.isArray(result) ? result : [];
  return items.slice(0, 20).map((item) =>
    pick(item, [
      "bookingCode",
      "courseName",
      "courseType",
      "date",
      "time",
      "partySize",
    ]),
  );
}

export async function executeToolCall({ name, input }, dependencies, context = {}) {
  const validation = validateToolCall(name, input);

  if (!validation.ok) {
    return validation;
  }

  if (!isPlainObject(dependencies)) {
    return { ok: false, error: TOOL_ERROR.UNAVAILABLE };
  }

  try {
    if (name === "search_slots" && typeof dependencies.searchSlots === "function") {
      const result = await dependencies.searchSlots(input);
      const shapedResult = shapeSearchResult(result);

      if (context.knownSlotIds instanceof Set) {
        for (const { id } of shapedResult.slots) {
          if (typeof id === "string") context.knownSlotIds.add(id);
        }
      }

      return { ok: true, ...shapedResult };
    }

    if (name === "create_booking" && typeof dependencies.createBooking === "function") {
      if (context.actorId === null) {
        return { ok: false, error: TOOL_ERROR.LOGIN_REQUIRED, loginRequired: true };
      }
      if (context.allowBookingCreation === false) {
        return { ok: false, error: TOOL_ERROR.CONFIRMATION_REQUIRED };
      }
      // 모델은 이전 답변만 보고 slotId 를 지어낼 수 있다. 같은 응답 안에서
      // search_slots 가 실제로 돌려준 id 로만 예약한다.
      if (
        context.knownSlotIds instanceof Set &&
        !context.knownSlotIds.has(input.slotId)
      ) {
        return { ok: false, error: TOOL_ERROR.UNKNOWN_SLOT };
      }

      const result = await dependencies.createBooking({
        ...input,
        source: "chat",
        userId: context.actorId ?? null,
      });

      if (!result?.ok) {
        return {
          ok: false,
          error: isNonEmptyString(result?.error, 200)
            ? result.error
            : "예약을 처리하지 못했어요.",
        };
      }

      const shapedResult = shapeBookingResult(result);
      return shapedResult.bookingCode
        ? { ok: true, ...shapedResult }
        : { ok: false, error: "예약번호를 확인하지 못했어요." };
    }

    if (name === "lookup_booking" && typeof dependencies.lookupBooking === "function") {
      const result = await dependencies.lookupBooking(input);

      if (!result?.ok) {
        return {
          ok: false,
          error: isNonEmptyString(result?.error, 200)
            ? result.error
            : "예약을 조회하지 못했어요.",
        };
      }

      return { ok: true, bookings: shapeLookupResult(result.bookings) };
    }
  } catch {
    return { ok: false, error: "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }

  return { ok: false, error: TOOL_ERROR.UNAVAILABLE };
}
