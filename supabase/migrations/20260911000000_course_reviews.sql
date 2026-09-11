-- 예약 이력이 있는 사용자만 작성할 수 있는 골프장 리뷰
create table if not exists public.course_reviews (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  rating      int not null check (rating between 1 and 5),
  difficulty  text not null check (difficulty in ('easy', 'medium', 'hard')),
  content     text not null check (char_length(content) between 1 and 1000),
  created_at  timestamptz not null default now(),
  unique (course_id, user_id)
);

alter table public.course_reviews enable row level security;

grant select on public.course_reviews to anon, authenticated;
grant all privileges on public.course_reviews to service_role;

drop policy if exists course_reviews_public_read on public.course_reviews;
create policy course_reviews_public_read
  on public.course_reviews for select
  to anon, authenticated
  using (true);

revoke insert, update, delete on public.course_reviews from anon, authenticated;

create index if not exists idx_course_reviews_course_created
  on public.course_reviews (course_id, created_at desc);

