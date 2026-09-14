-- critical 보안 사고에 한해 원본 IP 암호문을 30일간 보관한다.
-- 복호화 키는 DB가 아니라 Vercel의 SECURITY_IP_ENCRYPTION_KEY에만 있다.

alter table public.security_events
  add column if not exists ip_ciphertext text,
  add column if not exists ip_expires_at timestamptz;

alter table public.audit_logs
  add column if not exists reason text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'security_events_ip_forensics_consistency'
       and conrelid = 'public.security_events'::regclass
  ) then
    alter table public.security_events
      add constraint security_events_ip_forensics_consistency
      check (
        (ip_ciphertext is null and ip_expires_at is null)
        or (
          severity = 'critical'
          and ip_ciphertext is not null
          and ip_expires_at is not null
          and ip_ciphertext like 'v1:%'
        )
      );
  end if;

  if not exists (
    select 1 from pg_constraint
     where conname = 'audit_logs_reason_length'
       and conrelid = 'public.audit_logs'::regclass
  ) then
    alter table public.audit_logs
      add constraint audit_logs_reason_length
      check (reason is null or char_length(reason) <= 200);
  end if;
end;
$$;

comment on column public.security_events.ip_ciphertext is
  'critical 사고의 AES-256-GCM 암호화 IP. 평문 IP를 저장하지 않는다.';
comment on column public.security_events.ip_expires_at is
  '사고 IP 암호문 파기 시각. 기본 보관 기간은 30일이다.';
comment on column public.audit_logs.reason is
  '민감한 사고 IP 복호화 등 관리자 행위의 사유. 저장 전 마스킹한다.';

-- RLS와 별개로 컬럼 권한도 제한한다.
-- staff/admin이 Data API를 직접 호출해도 암호문은 읽을 수 없다.
revoke select on table public.security_events from anon, authenticated;
grant select (
  id,
  ts,
  rule_id,
  category,
  severity,
  actor_id,
  ip_hash,
  evidence,
  handled
) on public.security_events to authenticated;

-- 자동 파기 함수는 Data API에 노출되지 않는 private 스키마에 둔다.
create schema if not exists private;
revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

create or replace function private.purge_expired_security_event_ips()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_rows bigint;
begin
  with cleared as (
    update public.security_events
       set ip_ciphertext = null,
           ip_expires_at = null
     where ip_expires_at <= now()
       and ip_ciphertext is not null
    returning 1
  )
  select count(*) into affected_rows from cleared;

  return affected_rows;
end;
$$;

revoke all on function private.purge_expired_security_event_ips() from public;
revoke all on function private.purge_expired_security_event_ips() from anon, authenticated;

-- Supabase Cron(pg_cron)으로 매일 03:17 UTC에 만료된 암호문을 파기한다.
create extension if not exists pg_cron with schema pg_catalog;

select cron.unschedule(jobid)
  from cron.job
 where jobname = 'purge-expired-security-event-ips';

select cron.schedule(
  'purge-expired-security-event-ips',
  '17 3 * * *',
  'select private.purge_expired_security_event_ips()'
);
