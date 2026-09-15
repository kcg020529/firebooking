begin;

-- Requested reset: remove every existing booking and restore all slot inventory.
lock table public.bookings in access exclusive mode;
lock table public.slots in share row exclusive mode;

delete from public.bookings;
update public.slots set booked = 0;

-- New bookings must always belong to an authenticated account.
alter table public.bookings
  alter column user_id set not null;

alter table public.bookings
  drop constraint if exists bookings_user_id_fkey,
  add constraint bookings_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

commit;
