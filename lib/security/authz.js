import { after } from 'next/server.js';
import { headers } from 'next/headers.js';
import { createServerClient } from '../supabase.js';
import { hashIp } from './hash.js';
import { createMaskedPathEvidence } from './pii.js';

/** 서버 컴포넌트에는 request 객체가 없어 헤더에서 IP를 꺼낸다. */
async function getIpHashFromHeaders() {
  const headerList = await headers();
  const forwarded = headerList.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : headerList.get('x-real-ip');
  return hashIp(ip);
}

function getOptions(options = {}) {
  return {
    getIpHash: options.getIpHash ?? getIpHashFromHeaders,
    getSupabase: options.getSupabase ?? createServerClient,
    runAfter: options.runAfter ?? after,
  };
}

async function scheduleTask(runAfter, task) {
  const scheduled = runAfter(task);
  if (scheduled && typeof scheduled.then === 'function') await scheduled;
}

/** 관리자 영역 비인가 접근을 기록한다. */
export async function recordUnauthorizedAdminAccess(
  { path, user, targetType = 'page' },
  options = {},
) {
  const { getIpHash, getSupabase, runAfter } = getOptions(options);
  const ipHash = await getIpHash();
  const actorId = user?.id ?? null;
  const actorRole = user?.role ?? 'guest';
  const safePath = createMaskedPathEvidence(String(path ?? ''), 160);
  const evidence = `${actorRole} 역할이 ${safePath} 접근 시도`.slice(0, 200);

  await scheduleTask(runAfter, async () => {
    try {
      const supabase = getSupabase();
      await supabase.from('security_events').insert({
        rule_id: 'AUTHZ_ADMIN',
        category: 'authz',
        severity: 'critical',
        actor_id: actorId,
        ip_hash: ipHash,
        evidence,
      });

      await supabase.from('audit_logs').insert({
        actor_id: actorId,
        actor_role: actorRole,
        action: 'admin.view',
        target_type: targetType,
        target_id: safePath,
        result: 'deny',
        ip_hash: ipHash,
      });
    } catch (error) {
      console.error('[authz] 기록 실패:', error);
    }
  });
}

/** 관리자 영역 정상 접근도 감사 로그에 남긴다. */
export async function recordAdminAccess(
  { path, user },
  options = {},
) {
  const { getIpHash, getSupabase, runAfter } = getOptions(options);
  const ipHash = await getIpHash();
  const safePath = createMaskedPathEvidence(String(path ?? ''), 160);

  await scheduleTask(runAfter, async () => {
    try {
      const supabase = getSupabase();
      await supabase.from('audit_logs').insert({
        actor_id: user.id,
        actor_role: user.role,
        action: 'admin.view',
        target_type: 'page',
        target_id: safePath,
        result: 'allow',
        ip_hash: ipHash,
      });
    } catch (error) {
      console.error('[authz] 기록 실패:', error);
    }
  });
}

/** 존재하지 않는 관리자 경로 탐색을 별도 이상 행위로 남긴다. */
export async function recordUnknownAdminPath({ path, user }, options = {}) {
  const { getIpHash, getSupabase, runAfter } = getOptions(options);
  const ipHash = await getIpHash();
  const safePath = createMaskedPathEvidence(String(path ?? ''), 160);

  await scheduleTask(runAfter, async () => {
    try {
      const supabase = getSupabase();
      await supabase.from('security_events').insert({
        rule_id: 'ANO_ADMIN_PROBE',
        category: 'anomaly',
        severity: 'warn',
        actor_id: user?.id ?? null,
        ip_hash: ipHash,
        evidence: `존재하지 않는 관리자 경로 접근: ${safePath}`.slice(0, 200),
      });
    } catch (error) {
      console.error('[authz] 관리자 경로 탐색 기록 실패:', error);
    }
  });
}
