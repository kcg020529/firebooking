-- Extend the demo booking calendar from 2026-09-17 through 2026-09-30.
--
-- This is intentionally a one-time, fixed-date data migration. It does not
-- create a scheduler or automatically generate future slots.
-- Existing slots and bookings are preserved. The unique constraint on
-- (course_id, date, time) makes the migration safe to run more than once.

insert into public.slots (course_id, date, time, price, capacity, booked)
select
  course.id,
  slot_date::date,
  slot_time::time,
  case course.type
    when 'field' then 90000
    when 'screen' then 25000
  end as price,
  4 as capacity,
  0 as booked
from public.courses as course
cross join generate_series(
  date '2026-09-17',
  date '2026-09-30',
  interval '1 day'
) as generated_date(slot_date)
cross join lateral unnest(
  case course.type
    when 'field' then array[
      time '07:00',
      time '08:30',
      time '10:00',
      time '12:30',
      time '14:00'
    ]
    when 'screen' then array[
      time '10:00',
      time '12:00',
      time '14:00',
      time '16:00',
      time '18:00',
      time '20:00'
    ]
  end
) as generated_time(slot_time)
where course.type in ('field', 'screen')
on conflict (course_id, date, time) do nothing;
