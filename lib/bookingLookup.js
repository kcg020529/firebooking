import { createServerClient } from "./supabase.js";

function toBooking(row) {
  const slot = Array.isArray(row.slots) ? row.slots[0] : row.slots;
  const course = Array.isArray(slot?.courses) ? slot.courses[0] : slot?.courses;

  return {
    bookingCode: row.booking_code,
    course: course?.name ?? "골프장 정보 없음",
    date: slot?.date ?? null,
    time: slot?.time ?? null,
  };
}

export async function lookupOwnBookings(
  input,
  { actorId },
  clientFactory = createServerClient,
) {
  if (typeof actorId !== "string" || actorId.length === 0) {
    return { ok: false, error: "예약 소유권을 확인할 수 없어요." };
  }

  const supabase = clientFactory();
  let query = supabase
    .from("bookings")
    .select(
      "booking_code, slots!inner(date, time, courses!inner(name))",
    )
    // service_role은 RLS를 우회하므로 소유자 조건을 서버에서 반드시 건다.
    .eq("user_id", actorId)
    .limit(20);

  if (input.code) {
    query = query.eq("booking_code", input.code);
  } else {
    query = query.eq("name", input.name).eq("phone", input.phone);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[bookingLookup] 조회 실패");
    return { ok: false, error: "예약을 조회하지 못했어요." };
  }

  return {
    ok: true,
    bookings: data.map(toBooking),
  };
}
