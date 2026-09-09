create table if not exists public.login_attempt_limits (
  key_hash          text primary key check (key_hash ~ '^[0-9a-f]{64}$'),
  failed_attempts   int not null default 0 check (failed_attempts >= 0),
  pending_attempts  int not null default 0 check (pending_attempts >= 0),
  window_started_at timestamptz not null default now(),
  locked_until      timestamptz,
  updated_at        timestamptz not null default now()
);

create index if not exists idx_login_limits_updated
  on public.login_attempt_limits (updated_at);

alter table public.login_attempt_limits enable row level security;

create or replace function public.reserve_login_attempt(
  p_key_hash text,
  p_max_attempts int,
  p_window_seconds int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_state public.login_attempt_limits;
  v_total int;
begin
  if p_key_hash is null or p_key_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_LOGIN_KEY';
  end if;
  if p_max_attempts < 1 or p_window_seconds < 1 then
    raise exception 'INVALID_LOGIN_LIMIT';
  end if;

  insert into public.login_attempt_limits (key_hash)
  values (p_key_hash)
  on conflict (key_hash) do nothing;

  select * into v_state
  from public.login_attempt_limits
  where key_hash = p_key_hash
  for update;

  if v_state.locked_until is not null and v_state.locked_until > v_now then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'locked',
      'retryAfterSeconds', greatest(1, ceil(extract(epoch from (v_state.locked_until - v_now)))::int)
    );
  end if;

  if v_state.window_started_at <= v_now - make_interval(secs => p_window_seconds) then
    update public.login_attempt_limits
    set failed_attempts = 0,
        pending_attempts = 0,
        window_started_at = v_now,
        locked_until = null,
        updated_at = v_now
    where key_hash = p_key_hash
    returning * into v_state;
  elsif v_state.locked_until is not null then
    update public.login_attempt_limits
    set locked_until = null, updated_at = v_now
    where key_hash = p_key_hash
    returning * into v_state;
  end if;

  v_total := v_state.failed_attempts + v_state.pending_attempts;
  if v_total >= p_max_attempts then
    return jsonb_build_object('allowed', false, 'reason', 'busy', 'retryAfterSeconds', 1);
  end if;

  update public.login_attempt_limits
  set pending_attempts = pending_attempts + 1, updated_at = v_now
  where key_hash = p_key_hash;

  return jsonb_build_object(
    'allowed', true,
    'remainingAttempts', p_max_attempts - v_total - 1
  );
end;
$$;

create or replace function public.finish_login_attempt(
  p_key_hash text,
  p_outcome text,
  p_max_attempts int,
  p_lock_seconds int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_state public.login_attempt_limits;
  v_failed int;
  v_pending int;
  v_locked_until timestamptz;
begin
  if p_outcome not in ('success', 'failure', 'cancelled') then
    raise exception 'INVALID_LOGIN_OUTCOME';
  end if;
  if p_max_attempts < 1 or p_lock_seconds < 1 then
    raise exception 'INVALID_LOGIN_LIMIT';
  end if;

  select * into v_state
  from public.login_attempt_limits
  where key_hash = p_key_hash
  for update;

  if not found then
    raise exception 'LOGIN_RESERVATION_NOT_FOUND';
  end if;

  v_pending := greatest(v_state.pending_attempts - 1, 0);

  if p_outcome = 'success' then
    update public.login_attempt_limits
    set failed_attempts = 0,
        pending_attempts = v_pending,
        window_started_at = v_now,
        locked_until = null,
        updated_at = v_now
    where key_hash = p_key_hash;
    return jsonb_build_object('locked', false, 'remainingAttempts', p_max_attempts);
  end if;

  if p_outcome = 'cancelled' then
    update public.login_attempt_limits
    set pending_attempts = v_pending, updated_at = v_now
    where key_hash = p_key_hash;
    return jsonb_build_object(
      'locked', v_state.locked_until is not null and v_state.locked_until > v_now,
      'remainingAttempts', greatest(0, p_max_attempts - v_state.failed_attempts)
    );
  end if;

  v_failed := v_state.failed_attempts + 1;
  if v_failed >= p_max_attempts then
    v_locked_until := v_now + make_interval(secs => p_lock_seconds);
  else
    v_locked_until := null;
  end if;

  update public.login_attempt_limits
  set failed_attempts = v_failed,
      pending_attempts = v_pending,
      locked_until = v_locked_until,
      updated_at = v_now
  where key_hash = p_key_hash;

  return jsonb_build_object(
    'locked', v_locked_until is not null,
    'remainingAttempts', greatest(0, p_max_attempts - v_failed),
    'retryAfterSeconds', case when v_locked_until is null then null else p_lock_seconds end
  );
end;
$$;

revoke all on table public.login_attempt_limits from anon, authenticated;
revoke execute on function public.reserve_login_attempt(text, int, int) from public, anon, authenticated;
revoke execute on function public.finish_login_attempt(text, text, int, int) from public, anon, authenticated;
grant all privileges on table public.login_attempt_limits to service_role;
grant execute on function public.reserve_login_attempt(text, int, int) to service_role;
grant execute on function public.finish_login_attempt(text, text, int, int) to service_role;
