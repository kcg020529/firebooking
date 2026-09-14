import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationUrl = new URL(
  '../../supabase/migrations/20260914044306_critical_ip_forensics.sql',
  import.meta.url,
);

test('critical 사고 IP 마이그레이션은 암호문·만료·조회 사유 컬럼을 추가한다', async () => {
  const sql = await readFile(migrationUrl, 'utf8');

  assert.match(sql, /add column if not exists ip_ciphertext text/i);
  assert.match(sql, /add column if not exists ip_expires_at timestamptz/i);
  assert.match(sql, /alter table public\.audit_logs[\s\S]*add column if not exists reason text/i);
});

test('만료된 사고 IP 암호문을 자동 파기하는 하루 단위 cron을 등록한다', async () => {
  const sql = await readFile(migrationUrl, 'utf8');

  assert.match(sql, /create extension if not exists pg_cron/i);
  assert.match(sql, /update public\.security_events[\s\S]*set ip_ciphertext = null/i);
  assert.match(sql, /cron\.schedule/i);
});

test('인증된 사용자에게는 암호문 컬럼을 직접 조회할 권한을 주지 않는다', async () => {
  const sql = await readFile(migrationUrl, 'utf8');

  assert.match(sql, /revoke select on table public\.security_events from anon, authenticated/i);
  assert.match(sql, /grant select \([\s\S]*handled[\s\S]*\) on public\.security_events to authenticated/i);
  assert.doesNotMatch(sql, /grant select \([^)]*ip_ciphertext/i);
});
