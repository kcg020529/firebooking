import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationUrl = new URL('../../supabase/migrations/20260915030000_security_response.sql', import.meta.url);

test('IP 블랙리스트는 원본 IP 없이 RLS와 활성 해시 유일성을 강제한다', async () => {
  const sql = await readFile(migrationUrl, 'utf8');
  assert.match(sql, /create table if not exists public\.ip_blocklist/i);
  assert.doesNotMatch(sql, /\bip\s+(?:text|inet)\b/i);
  assert.match(sql, /ip_hash text not null/i);
  assert.match(sql, /ip_hash\s*~\s*'\^\[0-9a-f\]\{32\}\$'/i);
  assert.match(sql, /where is_active/i);
  assert.match(sql, /alter table public\.ip_blocklist enable row level security/i);
  assert.match(sql, /revoke all on table public\.ip_blocklist from anon, authenticated/i);
});

test('로그인 잠금 대응 대상은 64자리 HMAC만 허용한다', async () => {
  const sql = await readFile(migrationUrl, 'utf8');
  assert.match(sql, /response_target_hash text/i);
  assert.match(sql, /response_target_hash ~ '\^\[0-9a-f\]\{64\}\$'/i);
});
