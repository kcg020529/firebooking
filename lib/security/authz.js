import { after } from 'next/server.js';
import { headers } from 'next/headers.js';
import { createServerClient } from '../supabase.js';
import { getClientNetworkContext, hashIp } from './hash.js';
import { createMaskedPathEvidence } from './pii.js';
import { recordSecurityEvent } from './events.js';

/** 서버 컴포넌트에는 request 객체가 없어 헤더에서 IP를 꺼낸다. */
async function getIpHashFromHeaders() {
  const headerList = await headers();
  const context = getClientNetworkContext({
    headers: headerList,
    method: 'GET',
    url: 'https://firebooking.invalid/',
  });
  return hashIp(context.ip);
}

async function getNetworkContextFromHeaders(path = '/') {
  const headerList = await headers();
  return getClientNetworkContext({
    headers: headerList,
    method: 'GET',
    url: new URL(String(path || '/'), 'https://firebooking.invalid').toString(),
  });
}

function getOptions(options = {}) {
  return {
    getIpHash: options.getIpHash ?? getIpHashFromHeaders,
    getNetworkContext: options.getNetworkContext
      ?? (options.getIpHash ? async () => null : getNetworkContextFromHeaders),
    getSupabase: options.getSupabase ?? createServerClient,
    runAfter: options.runAfter ?? after,
    encryptionEnv: options.encryptionEnv,
  };
}

async function scheduleTask(runAfter, task) {
  const scheduled = runAfter(task);
  if (scheduled && typeof scheduled.then === 'function') await scheduled;
}

/**
 * 같은 IP 의 AUTHZ_ADMIN 을 이 시간 안에 한 번만 기록한다.
 *
 * /admin 페이지는 withApiLog 를 거치지 않아 요청 제한이 없다. 중복 억제가
 * 없으면 비인가 요청을 반복하는 것만으로 critical 이벤트·Discord 알림·IP
 * 암호화·감사 기록이 요청마다 쌓여, 진짜 사고 알림을 묻고 로그를 오염시킨다.
 * 이상 탐지 규칙(ANO_*)이 쓰는 "IP·규칙별 창당 1회" 방식을 여기에도 적용한다.
 */
const AUTHZ_ADMIN_DEDUP_WINDOW_MINUTES = 10;

async function hasRecentAuthzEvent(supabase, ipHash) {
  if (!ipHash) return false;
  const since = new Date(Date.now() - AUTHZ_ADMIN_DEDUP_WINDOW_MINUTES * 60_000).toISOString();
  const { count, error } = await supabase
    .from('security_events')
    .select('id', { count: 'exact', head: true })
    .eq('rule_id', 'AUTHZ_ADMIN')
    .eq('ip_hash', ipHash)
    .gte('ts', since);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/** 관리자 영역 비인가 접근을 기록한다. */
export async function recordUnauthorizedAdminAccess(
  { path, user, targetType = 'page' },
  options = {},
) {
  const {
    getIpHash,
    getNetworkContext,
    getSupabase,
    runAfter,
    encryptionEnv,
  } = getOptions(options);
  const ipHash = await getIpHash();
  const networkContext = await getNetworkContext(path);
  const actorId = user?.id ?? null;
  const actorRole = user?.role ?? 'guest';
  const safePath = createMaskedPathEvidence(String(path ?? ''), 160);
  const evidence = `${actorRole} 역할이 ${safePath} 접근 시도`.slice(0, 200);

  await scheduleTask(runAfter, async () => {
    try {
      const supabase = getSupabase();

      // 같은 IP 가 창 안에 이미 기록됐으면 이벤트·알림·감사 기록을 모두 건너뛴다.
      if (await hasRecentAuthzEvent(supabase, ipHash)) return;

      await recordSecurityEvent({
        rule_id: 'AUTHZ_ADMIN',
        category: 'authz',
        severity: 'critical',
        actor_id: actorId,
        ip_hash: ipHash,
        evidence,
      }, {
        client: supabase,
        networkContext,
        encryptionEnv,
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
      await recordSecurityEvent({
        rule_id: 'ANO_ADMIN_PROBE',
        category: 'anomaly',
        severity: 'warn',
        actor_id: user?.id ?? null,
        ip_hash: ipHash,
        evidence: `존재하지 않는 관리자 경로 접근: ${safePath}`.slice(0, 200),
      }, { client: supabase });
    } catch (error) {
      console.error('[authz] 관리자 경로 탐색 기록 실패:', error);
    }
  });
}
