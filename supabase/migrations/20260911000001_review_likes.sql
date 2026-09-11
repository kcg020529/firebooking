alter table public.course_reviews
  add column if not exists like_count integer not null default 0 check (like_count >= 0);

create table if not exists public.course_review_likes (
  review_id uuid not null references public.course_reviews(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);

alter table public.course_review_likes enable row level security;
revoke all on public.course_review_likes from anon, authenticated;
grant all on public.course_review_likes to service_role;

create or replace function public.toggle_course_review_like(p_review_id uuid, p_user_id uuid)
returns table (liked boolean, like_count integer)
language plpgsql security definer set search_path = public
as $$
begin
  if exists (select 1 from public.course_review_likes where review_id = p_review_id and user_id = p_user_id) then
    delete from public.course_review_likes where review_id = p_review_id and user_id = p_user_id;
    update public.course_reviews set like_count = greatest(0, like_count - 1) where id = p_review_id;
    return query select false, (select cr.like_count from public.course_reviews cr where cr.id = p_review_id);
  else
    insert into public.course_review_likes(review_id, user_id) values (p_review_id, p_user_id);
    update public.course_reviews set like_count = like_count + 1 where id = p_review_id;
    return query select true, (select cr.like_count from public.course_reviews cr where cr.id = p_review_id);
  end if;
end;
$$;
revoke all on function public.toggle_course_review_like(uuid, uuid) from public, anon, authenticated;
grant execute on function public.toggle_course_review_like(uuid, uuid) to service_role;
