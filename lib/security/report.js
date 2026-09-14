import { createServerClient } from '../supabase.js';
import { decryptIncidentIp } from './hash.js';
import { createMaskedEvidence } from './pii.js';

/**
 * 보안 대시보드가 읽는 조회 계층.
 *
 * B 의 대시보드 화면은 이 함수들이 돌려준 값을 그리기만 한다.
 * 집계 로직이 화면에 흩어지면 "무엇을 세는 규칙인가"가 코드 여러 곳에 생긴다.
 *
 * ⚠️ 여기서 돌려주는 값에는 원문 PII 가 없다.
 *    security_events.evidence 는 애초에 마스킹본만 저장되고,
 *    audit_logs 는 예약번호·경로 같은 식별자만 담는다.
 */

/** 한 번에 내려보낼 최대 행 수. 대시보드는 최신 것만 보면 된다. */
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

async function recordIpRevealAudit({
  client,
  eventId,
  user,
  adminIpHash,
  reason,
  result,
}) {
  const { error } = await client.from('audit_logs').insert({
    actor_id: user?.id ?? null,
    actor_role: user?.role ?? 'guest',
    action: 'security.ip.reveal',
    target_type: 'security_event',
    target_id: String(eventId),
    result,
    ip_hash: adminIpHash ?? null,
    reason: createMaskedEvidence(reason, 200),
  });
  if (error) throw error;
}

/**
 * critical 사고의 원본 IP를 관리자에게만 보여준다.
 * 복호화 성공·거부 모두 사유와 함께 감사 기록에 남긴다.
 */
export async function revealSecurityEventIp({
  eventId,
  reason,
  user,
  adminIpHash = null,
  client = createServerClient(),
  now = new Date(),
}) {
  const numericEventId = Number(eventId);
  const safeReason = typeof reason === 'string' ? reason.trim() : '';

  if (!Number.isSafeInteger(numericEventId) || numericEventId < 1) {
    return { ok: false, status: 400, error: '사고 ID가 올바르지 않습니다.' };
  }
  if (safeReason.length < 10 || safeReason.length > 200) {
    return { ok: false, status: 400, error: '조회 사유를 10~200자로 입력해 주세요.' };
  }

  if (user?.role !== 'admin') {
    await recordIpRevealAudit({
      client,
      eventId: numericEventId,
      user,
      adminIpHash,
      reason: safeReason,
      result: 'deny',
    });
    return { ok: false, status: 403, error: '관리자 권한이 필요합니다.' };
  }

  const { data: event, error } = await client
    .from('security_events')
    .select('id, severity, ip_ciphertext, ip_expires_at')
    .eq('id', numericEventId)
    .maybeSingle();

  if (error) throw error;
  if (!event || event.severity !== 'critical' || !event.ip_ciphertext) {
    await recordIpRevealAudit({
      client,
      eventId: numericEventId,
      user,
      adminIpHash,
      reason: safeReason,
      result: 'deny',
    });
    return { ok: false, status: 404, error: '보관된 사고 IP가 없습니다.' };
  }

  if (!event.ip_expires_at || new Date(event.ip_expires_at) <= new Date(now)) {
    await recordIpRevealAudit({
      client,
      eventId: numericEventId,
      user,
      adminIpHash,
      reason: safeReason,
      result: 'deny',
    });
    return { ok: false, status: 410, error: '사고 IP 보관 기간이 만료됐습니다.' };
  }

  const ip = decryptIncidentIp(event.ip_ciphertext);
  await recordIpRevealAudit({
    client,
    eventId: numericEventId,
    user,
    adminIpHash,
    reason: safeReason,
    result: 'allow',
  });

  return { ok: true, ip, expiresAt: event.ip_expires_at };
}

function clampLimit(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

/** DB(snake_case) → API(camelCase). 변환은 여기 한 곳에서만. */
function toSecurityEvent(row) {
  return {
    id: row.id,
    ts: row.ts,
    ruleId: row.rule_id,
    category: row.category,
    severity: row.severity,
    actorId: row.actor_id,
    ipHash: row.ip_hash,
    evidence: row.evidence,
    handled: row.handled,
  };
}

function toAuditLog(row) {
  return {
    id: row.id,
    ts: row.ts,
    actorId: row.actor_id,
    actorRole: row.actor_role,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    result: row.result,
    ipHash: row.ip_hash,
  };
}

/**
 * 탐지 이벤트 목록.
 * @param {{ severity?, category?, from?, to?, limit? }} filters
 */
export async function listSecurityEvents(filters = {}) {
  const supabase = createServerClient();

  let query = supabase
    .from('security_events')
    .select('id, ts, rule_id, category, severity, actor_id, ip_hash, evidence, handled')
    .order('ts', { ascending: false })
    .limit(clampLimit(filters.limit));

  if (filters.severity) query = query.eq('severity', filters.severity);
  if (filters.category) query = query.eq('category', filters.category);
  if (filters.from) query = query.gte('ts', filters.from);
  if (filters.to) query = query.lte('ts', filters.to);

  const { data, error } = await query;
  if (error) throw error;

  return data.map(toSecurityEvent);
}

/**
 * 심각도별 건수 + 규칙별 히트.
 *
 * Postgres 에서 group by 를 하려면 RPC 를 하나 더 만들어야 하는데,
 * 이 프로젝트 규모(이벤트 수백 건)에서는 가져와서 세는 편이 단순하다.
 * 건수가 수만 건대로 늘면 그때 집계 뷰로 옮긴다.
 */
export async function summarizeSecurityEvents(filters = {}) {
  const events = await listSecurityEvents({ ...filters, limit: MAX_LIMIT });

  const bySeverity = { info: 0, warn: 0, critical: 0 };
  const byRule = {};
  let unhandled = 0;

  for (const e of events) {
    if (e.severity in bySeverity) bySeverity[e.severity] += 1;
    byRule[e.ruleId] = (byRule[e.ruleId] ?? 0) + 1;
    if (!e.handled) unhandled += 1;
  }

  return {
    total: events.length,
    bySeverity,
    // 많이 걸린 규칙부터. 대시보드가 정렬을 또 하지 않아도 되게.
    byRule: Object.entries(byRule)
      .map(([ruleId, count]) => ({ ruleId, count }))
      .sort((a, b) => b.count - a.count),
    unhandled,
  };
}

/**
 * 감사 로그 목록.
 * @param {{ actorId?, action?, result?, from?, to?, limit? }} filters
 */
export async function listAuditLogs(filters = {}) {
  const supabase = createServerClient();

  let query = supabase
    .from('audit_logs')
    .select('id, ts, actor_id, actor_role, action, target_type, target_id, result, ip_hash')
    .order('ts', { ascending: false })
    .limit(clampLimit(filters.limit));

  if (filters.actorId) query = query.eq('actor_id', filters.actorId);
  if (filters.action) query = query.eq('action', filters.action);
  if (filters.result) query = query.eq('result', filters.result);
  if (filters.from) query = query.gte('ts', filters.from);
  if (filters.to) query = query.lte('ts', filters.to);

  const { data, error } = await query;
  if (error) throw error;

  return data.map(toAuditLog);
}
