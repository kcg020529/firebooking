-- ============================================================
--  firebooking · 스키마
--  실행 순서: schema.sql → policies.sql → seed.sql
--  Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 Run.
--  여러 번 실행해도 안전하도록 전부 IF NOT EXISTS / OR REPLACE.
-- ============================================================

-- ────────────────────────────────────────────────────────────
--  1. 서비스 테이블
-- ────────────────────────────────────────────────────────────

-- 골프장
create table if not exists public.courses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  type        text not null check (type in ('field', 'screen')),  -- 필드 / 스크린
  region      text,
  address     text,
  phone       text,
  image_url   text,
  description text,
  created_at  timestamptz not null default now()
);

-- 예약 가능 슬롯 (티타임 / 스크린 타석 시간)
create table if not exists public.slots (
  id        uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  date      date not null,
  time      time not null,
  price     int  not null check (price >= 0),
  capacity  int  not null default 4 check (capacity > 0),
  booked    int  not null default 0 check (booked >= 0),
  unique (course_id, date, time),
  -- 정원 초과를 DB가 마지막으로 한 번 더 막는다.
  -- 애플리케이션 검증이 뚫려도 여기서 걸린다.
  constraint slots_booked_within_capacity check (booked <= capacity)
);

-- 예약
-- ★ 원본 PII(name, phone)가 저장되는 곳은 이 테이블 하나뿐.
--   chat_logs · security_events 에는 절대 원문을 넣지 않는다.
create table if not exists public.bookings (
  id           uuid primary key default gen_random_uuid(),
  slot_id      uuid not null references public.slots(id),
  user_id      uuid references auth.users(id) on delete set null,  -- 비로그인 예약은 null
  booking_code text not null unique,        -- 'GB-8F3K2' 형태. lib/bookings.js 가 생성
  name         text not null,
  phone        text not null,
  party_size   int  not null check (party_size >= 1),
  memo         text,
  source       text not null default 'form' check (source in ('form', 'chat')),
  created_at   timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
--  2. 보안 테이블
-- ────────────────────────────────────────────────────────────

-- 사용자 역할 (S4)
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  display_name text,
  role         text not null default 'user'
                 check (role in ('guest', 'user', 'staff', 'admin')),
  created_at   timestamptz not null default now()
);

-- API 전수 로깅 (S3) — middleware.js 가 기록
create table if not exists public.api_logs (
  id          bigserial primary key,
  ts          timestamptz not null default now(),
  method      text,
  path        text,
  status      int,
  duration_ms int,
  actor_id    uuid,
  ip_hash     text,        -- ★ 원본 IP 금지. IP_HASH_SALT 로 해시한 값만
  user_agent  text
);

-- 감사 로그 (S4) — 누가 · 언제 · 무엇을 · 결과
create table if not exists public.audit_logs (
  id          bigserial primary key,
  ts          timestamptz not null default now(),
  actor_id    uuid,
  actor_role  text,
  action      text not null,   -- '대상.동작' 형태: booking.create, admin.view, auth.login
  target_type text,
  target_id   text,
  result      text not null check (result in ('allow', 'deny')),
  ip_hash     text
);

-- 탐지 결과 (S1 · S2 · S3)
create table if not exists public.security_events (
  id       bigserial primary key,
  ts       timestamptz not null default now(),
  rule_id  text not null,   -- PII_PHONE, INJ_IGNORE, ANO_CODE_ENUM ...
  category text not null check (category in ('pii', 'injection', 'anomaly', 'authz', 'leak')),
  severity text not null check (severity in ('info', 'warn', 'critical')),
  actor_id uuid,
  ip_hash  text,
  evidence text,            -- ★ 마스킹된 발췌만. 원문 PII 절대 금지
  handled  boolean not null default false
);

-- 챗봇 대화 로그 (S1) — 마스킹본만 저장
create table if not exists public.chat_logs (
  id             bigserial primary key,
  ts             timestamptz not null default now(),
  session_id     text,
  role           text check (role in ('user', 'assistant', 'tool', 'system')),
  content_masked text not null,   -- ★ 원문 저장 금지
  pii_hits       int not null default 0
);

-- ────────────────────────────────────────────────────────────
--  3. 인덱스
--  대시보드는 "최신순 + 필터"가 기본 질의라 ts DESC 를 깔아둔다.
-- ────────────────────────────────────────────────────────────

create index if not exists idx_courses_type          on public.courses (type);
create index if not exists idx_slots_course_date     on public.slots (course_id, date);
create index if not exists idx_slots_date            on public.slots (date);
create index if not exists idx_bookings_code         on public.bookings (booking_code);
create index if not exists idx_bookings_phone        on public.bookings (phone);
create index if not exists idx_bookings_user         on public.bookings (user_id);
create index if not exists idx_bookings_slot         on public.bookings (slot_id);

create index if not exists idx_api_logs_ts           on public.api_logs (ts desc);
create index if not exists idx_api_logs_ip           on public.api_logs (ip_hash, ts desc);
create index if not exists idx_audit_logs_ts         on public.audit_logs (ts desc);
create index if not exists idx_audit_logs_actor      on public.audit_logs (actor_id, ts desc);
create index if not exists idx_sec_events_ts         on public.security_events (ts desc);
create index if not exists idx_sec_events_severity   on public.security_events (severity, ts desc);
create index if not exists idx_sec_events_rule       on public.security_events (rule_id);
create index if not exists idx_chat_logs_session     on public.chat_logs (session_id, ts);

-- ────────────────────────────────────────────────────────────
--  4. 역할 조회 헬퍼
--  ⚠️ security definer 인 이유: profiles 정책 안에서 profiles 를
--     조회하면 정책이 자기 자신을 다시 부르며 무한 재귀에 빠진다.
--     이 함수는 RLS 를 우회해서 역할만 읽어 그 고리를 끊는다.
-- ────────────────────────────────────────────────────────────

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'guest'
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role in ('staff', 'admin') from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ────────────────────────────────────────────────────────────
--  5. 회원가입 시 profiles 자동 생성
--  Supabase Auth 는 auth.users 에만 행을 만든다.
--  역할을 붙이려면 우리가 profiles 를 따라 만들어줘야 한다.
-- ────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    'user'                                  -- 기본 역할. staff/admin 은 수동 승격
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ────────────────────────────────────────────────────────────
--  6. 예약 생성 — 원자적 처리
--
--  왜 DB 함수인가:
--  "정원 확인 → booked 증가 → 예약 insert" 를 앱에서 나눠 하면
--  동시 요청 두 개가 같은 잔여 좌석을 보고 둘 다 통과한다.
--  아래는 slots 행을 FOR UPDATE 로 잠근 뒤 한 트랜잭션에서 처리해
--  그 경합을 막는다. (Tier 0 체크리스트 "정원 초과 방지" 항목)
--
--  lib/bookings.js 의 createBooking() 이 이 함수를 호출한다.
--  단일 진입점 규칙은 그대로 — 폼과 챗봇 모두 createBooking() 을 거친다.
-- ────────────────────────────────────────────────────────────

create or replace function public.create_booking(
  p_slot_id      uuid,
  p_booking_code text,
  p_name         text,
  p_phone        text,
  p_party_size   int,
  p_memo         text default null,
  p_source       text default 'form',
  p_user_id      uuid default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot    public.slots;
  v_booking public.bookings;
begin
  if p_party_size is null or p_party_size < 1 then
    raise exception 'INVALID_PARTY_SIZE';
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception 'MISSING_NAME';
  end if;

  if p_phone is null or btrim(p_phone) = '' then
    raise exception 'MISSING_PHONE';
  end if;

  -- 행 잠금. 다른 트랜잭션은 여기서 대기한다.
  select * into v_slot
  from public.slots
  where id = p_slot_id
  for update;

  if not found then
    raise exception 'SLOT_NOT_FOUND';
  end if;

  if v_slot.booked + p_party_size > v_slot.capacity then
    raise exception 'CAPACITY_EXCEEDED';
  end if;

  update public.slots
  set booked = booked + p_party_size
  where id = p_slot_id;

  insert into public.bookings
    (slot_id, user_id, booking_code, name, phone, party_size, memo, source)
  values
    (p_slot_id, p_user_id, p_booking_code, p_name, p_phone, p_party_size, p_memo, p_source)
  returning * into v_booking;

  return v_booking;
end;
$$;
