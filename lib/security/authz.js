import { after } from 'next/server.js';
import { headers } from 'next/headers.js';
import { createServerClient } from '../supabase.js';
import { getClientNetworkContext, hashIp } from './hash.js';
import { createMaskedPathEvidence } from './pii.js';
import { recordSecurityEvent } from './events.js';
import { blockIp } from './ipBlocklist.js';
import { ANOMALY_RULES } from './securityConfig.js';

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
    blockIpFn: options.blockIpFn ?? blockIp,
  };
}

async function scheduleTask(runAfter, task) {
  const scheduled = runAfter(task);
  if (scheduled && typeof scheduled.then === 'function') await scheduled;
}

/**
 * 같은 IP 의 AUTHZ_ADMIN 사고 이벤트를 이 시간 안에 한 번만 기록한다.
 *
 * /admin 페이지는 withApiLog 를 거치지 않아 요청 제한이 없다. 중복 억제가
 * 없으면 비인가 요청을 반복하는 것만으로 critical 이벤트·Discord 알림·IP
 * 암호화·Discord 알림이 요청마다 쌓여 진짜 사고 알림을 묻는 것을 막는다.
 * 감사 기록은 반복 공격 횟수의 근거이므로 모든 접근을 남긴다.
 * 이상 탐지 규칙(ANO_*)이 쓰는 "IP·규칙별 창당 1회" 방식을 여기에도 적용한다.
 */
const AUTHZ_ADMIN_DEDUP_WINDOW_MINUTES = 10;

async function hasRecentRuleEvent(supabase, ipHash, ruleId, windowMinutes = AUTHZ_ADMIN_DEDUP_WINDOW_MINUTES) {
  if (!ipHash) return false;
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  const { count, error } = await supabase
    .from('security_events')
    .select('id', { count: 'exact', head: true })
    .eq('rule_id', ruleId)
    .eq('ip_hash', ipHash)
    .gte('ts', since);
  if (error) throw error;
  return (count ?? 0) > 0;
}

async function countRecentAdminDenies(supabase, ipHash, windowMinutes) {
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  const { count, error } = await supabase.from('audit_logs')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash).eq('action', 'admin.view').eq('result', 'deny').gte('ts', since);
  if (error) throw error;
  return count ?? 0;
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
    blockIpFn,
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

      await supabase.from('audit_logs').insert({
        actor_id: actorId,
        actor_role: actorRole,
        action: 'admin.view',
        target_type: targetType,
        target_id: safePath,
        result: 'deny',
        ip_hash: ipHash,
      });

      // 사고 이벤트는 알림 도배를 막되, 감사 기록은 반복 횟수 판정을 위해 매번 남긴다.
      if (!(await hasRecentRuleEvent(supabase, ipHash, 'AUTHZ_ADMIN'))) {
        await recordSecurityEvent({
          rule_id: 'AUTHZ_ADMIN', category: 'authz', severity: 'critical',
          actor_id: actorId, ip_hash: ipHash, evidence,
        }, { client: supabase, networkContext, encryptionEnv });
      }

      const repeatRule = ANOMALY_RULES.ANO_ADMIN_BF;
      const attempts = await countRecentAdminDenies(supabase, ipHash, repeatRule.windowMinutes);
      if (
        attempts >= repeatRule.threshold &&
        networkContext?.ip &&
        !(await hasRecentRuleEvent(supabase, ipHash, repeatRule.id, repeatRule.windowMinutes))
      ) {
        await recordSecurityEvent({
          rule_id: repeatRule.id,
          category: repeatRule.category,
          severity: repeatRule.severity,
          actor_id: actorId,
          ip_hash: ipHash,
          evidence: `${repeatRule.windowMinutes}분 내 관리자 영역 비인가 접근 ${attempts}회, 이후 요청 방화벽 차단`,
        }, { client: supabase, networkContext, encryptionEnv });

        await blockIpFn({
          ip: networkContext.ip,
          ipHash,
          reason: `${repeatRule.windowMinutes}분 내 관리자 영역 비인가 접근 ${attempts}회`,
          actorId: null,
          blockType: 'automatic',
        });
      }
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
