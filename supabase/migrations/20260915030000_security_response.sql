alter table public.security_events
  add column if not exists response_target_hash text
  check (response_target_hash is null or response_target_hash ~ '^[0-9a-f]{64}$');

create table if not exists public.ip_blocklist (
  id bigint generated always as identity primary key,
  ip_hash text not null check (ip_hash ~ '^[0-9a-f]{32}$'),
  source_event_id bigint references public.security_events(id) on delete set null,
  status text not null default 'applying' check (status in ('applying', 'active', 'sync_error', 'released')),
  is_active boolean not null default true,
  block_type text not null check (block_type in ('manual', 'automatic')),
  reason text not null check (char_length(reason) between 1 and 200),
  cloudflare_rule_id text,
  blocked_requests bigint not null default 0 check (blocked_requests >= 0),
  blocked_by uuid references auth.users(id) on delete set null,
  released_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  released_at timestamptz,
  sync_error text
);

create unique index if not exists idx_ip_blocklist_one_active
  on public.ip_blocklist (ip_hash) where is_active;
create index if not exists idx_ip_blocklist_created
  on public.ip_blocklist (created_at desc);

alter table public.ip_blocklist enable row level security;
revoke all on table public.ip_blocklist from anon, authenticated;
grant all privileges on table public.ip_blocklist to service_role;
grant usage, select on sequence public.ip_blocklist_id_seq to service_role;

create or replace function public.increment_ip_block_count(p_block_id bigint)
returns void
language sql
security definer
set search_path = public
as $$
  update public.ip_blocklist
  set blocked_requests = blocked_requests + 1
  where id = p_block_id and is_active;
$$;

revoke execute on function public.increment_ip_block_count(bigint) from public, anon, authenticated;
grant execute on function public.increment_ip_block_count(bigint) to service_role;
