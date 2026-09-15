-- Vary September demo inventory while preserving all existing bookings.
update public.slots as slot
set
  price = case course.type
    when 'field' then
      case when slot.time < time '09:00' then 110000 when slot.time < time '12:00' then 130000 else 100000 end
      + case when extract(isodow from slot.date) in (6, 7) then 30000 else 0 end
      + (mod((hashtext(course.id::text)::bigint & 2147483647), 3) * 10000)::int
    when 'screen' then
      case when slot.time >= time '18:00' then 35000 else 25000 end
      + case when extract(isodow from slot.date) in (6, 7) then 5000 else 0 end
      + (mod((hashtext(course.id::text)::bigint & 2147483647), 2) * 5000)::int
  end,
  capacity = greatest(
    slot.booked,
    2 + mod((hashtext(course.id::text || slot.date::text || slot.time::text)::bigint & 2147483647), 3)::int
  )
from public.courses as course
where course.id = slot.course_id
  and slot.date between date '2026-09-17' and date '2026-09-30';

-- Cancel an owned booking and release its seats in one transaction.
create or replace function public.cancel_booking(p_booking_code text, p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
begin
  select booking.* into v_booking
    from public.bookings as booking
   where booking.booking_code = upper(trim(p_booking_code))
     and booking.user_id = p_user_id
   for update;

  if not found then return null; end if;

  delete from public.bookings where id = v_booking.id;
  update public.slots
     set booked = greatest(booked - v_booking.party_size, 0)
   where id = v_booking.slot_id;

  return v_booking.booking_code;
end;
$$;

revoke all on function public.cancel_booking(text, uuid) from public;
revoke all on function public.cancel_booking(text, uuid) from anon, authenticated;
grant execute on function public.cancel_booking(text, uuid) to service_role;

