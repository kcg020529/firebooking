import { after } from 'next/server.js';
import { createServerClient } from '../supabase.js';
import { recordSecurityEvent } from './events.js';
import { ANOMALY_RULES } from './securityConfig.js';

export { ANOMALY_RULES } from './securityConfig.js';

/**
 * S2 — 이상 행위 탐지 규칙.
 *
 * 규칙은 코드 여기저기가 아니라 이 배열 한 곳에 모은다.
 * 임계값을 조정할 때 라우트를 뒤지지 않아도 되고, 발표에서
 * "탐지 규칙 설계"를 이 표 하나로 설명할 수 있다.
 *
 * 챗봇 입출력 쪽 탐지(PII·프롬프트 인젝션)는 C 담당의
 * pii.js · injection.js 에 있다. 여기는 예약 도메인의 행위 패턴만 다룬다.
 */

/**
 * 최근 windowMinutes 안에 같은 IP 가 남긴 실패 조회 수를 센다.
 *
 * audit_logs 를 그대로 근거로 쓴다 — 탐지를 위해 별도 카운터 테이블을
 * 두면 그 테이블이 또 관리 대상이 되고, 감사 기록과 어긋날 수 있다.
 */
async function countRecentDenies(supabase, { ipHash, action, windowMinutes }) {
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();

  const { count, error } = await supabase
    .from('audit_logs')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .eq('action', action)
    .eq('result', 'deny')
    .gte('ts', since);

  if (error) {
    console.error('[rules] 카운트 실패:', error);
    return 0;
  }
  return count ?? 0;
}

async function hasRecentEvent(supabase, { ruleId, ipHash, since }) {
  const { count } = await supabase
    .from('security_events')
    .select('id', { count: 'exact', head: true })
    .eq('rule_id', ruleId)
    .eq('ip_hash', ipHash)
    .gte('ts', since);
  return (count ?? 0) > 0;
}

async function insertAnomalyOnce(supabase, { rule, ipHash, actorId, evidence }) {
  const since = new Date(Date.now() - rule.windowMinutes * 60_000).toISOString();
  if (await hasRecentEvent(supabase, { ruleId: rule.id, ipHash, since })) return;

  await recordSecurityEvent({
    rule_id: rule.id,
    category: rule.category,
    severity: rule.severity,
    actor_id: actorId ?? null,
    ip_hash: ipHash,
    evidence,
  }, { client: supabase });
}

/** 모든 API의 IP별 1분 호출량을 검사한다. 저장소 장애 때는 서비스만은 유지한다. */
export async function checkApiRateLimit({ ipHash, client } = {}) {
  if (!ipHash) return { limited: false };

  const rule = ANOMALY_RULES.ANO_RATE;
  const since = new Date(Date.now() - rule.windowMinutes * 60_000).toISOString();

  try {
    const supabase = client ?? createServerClient();
    const { count, error } = await supabase
      .from('api_logs')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('ts', since);

    if (error) throw error;
    if ((count ?? 0) < rule.threshold) return { limited: false };

    await insertAnomalyOnce(supabase, {
      rule,
      ipHash,
      actorId: null,
      evidence: `${rule.windowMinutes}분 내 API 호출 ${count}회 초과`,
    });
    return { limited: true, retryAfterSeconds: rule.windowMinutes * 60 };
  } catch (error) {
    console.error('[rules] ANO_RATE 검사 실패:', error);
    return { limited: false };
  }
}

/**
 * 예약번호 순회 탐지.
 *
 * 조회가 실패할 때마다 부르고, 임계값을 넘으면 security_events 에 남긴다.
 * 응답을 보낸 뒤에 계산하므로 사용자 응답이 느려지지 않는다.
 *
 * @param {object} params
 * @param {string} params.ipHash
 * @param {string|null} params.actorId
 * @param {string} params.action   audit_logs 의 action 값
 */
export function detectCodeEnumeration(
  { ipHash, actorId, action },
  { client, schedule = after } = {},
) {
  if (!ipHash) return;

  const rule = ANOMALY_RULES.ANO_CODE_ENUM;

  return schedule(async () => {
    try {
      const supabase = client ?? createServerClient();

      const failures = await countRecentDenies(supabase, {
        ipHash,
        action,
        windowMinutes: rule.windowMinutes,
      });

      if (failures < rule.threshold) return;

      await insertAnomalyOnce(supabase, {
        rule,
        ipHash,
        actorId,
        evidence: `${rule.windowMinutes}분 내 존재하지 않는 예약번호 조회 ${failures}회`,
      });
    } catch (error) {
      console.error('[rules] ANO_CODE_ENUM 기록 실패:', error);
    }
  });
}

/** 성공 예약 반복을 슬롯 선점 시도로 탐지한다. */
export function detectScalping(
  { ipHash, actorId, action },
  { client, schedule = after } = {},
) {
  if (!ipHash) return;
  const rule = ANOMALY_RULES.ANO_SCALP;

  return schedule(async () => {
    try {
      const supabase = client ?? createServerClient();
      const since = new Date(Date.now() - rule.windowMinutes * 60_000).toISOString();
      const { count, error } = await supabase
        .from('audit_logs')
        .select('id', { count: 'exact', head: true })
        .eq('ip_hash', ipHash)
        .eq('action', action)
        .eq('result', 'allow')
        .gte('ts', since);
      if (error) throw error;

      const attempts = count ?? 0;
      if (attempts < rule.threshold) return;
      await insertAnomalyOnce(supabase, {
        rule,
        ipHash,
        actorId,
        evidence: `${rule.windowMinutes}분 내 예약 생성 ${attempts}회`,
      });
    } catch (error) {
      console.error('[rules] ANO_SCALP 기록 실패:', error);
    }
  });
}

/** 같은 IP가 여러 전화번호 지문으로 조회하는 행위를 탐지한다. */
export function detectLookupBruteForce(
  { ipHash, actorId, action, phoneHash },
  { client, schedule = after } = {},
) {
  if (!ipHash || !phoneHash) return;
  const rule = ANOMALY_RULES.ANO_LOOKUP_BF;

  return schedule(async () => {
    try {
      const supabase = client ?? createServerClient();
      const since = new Date(Date.now() - rule.windowMinutes * 60_000).toISOString();
      const { data, error } = await supabase
        .from('audit_logs')
        .select('target_id')
        .eq('ip_hash', ipHash)
        .eq('action', action)
        .eq('result', 'deny')
        .gte('ts', since)
        .limit(200);
      if (error) throw error;

      const fingerprints = new Set(
        (data ?? [])
          .map(({ target_id: targetId }) => targetId)
          .filter((targetId) => typeof targetId === 'string' && targetId.startsWith('phone:')),
      );
      fingerprints.add(`phone:${phoneHash}`);
      if (fingerprints.size < rule.threshold) return;

      await insertAnomalyOnce(supabase, {
        rule,
        ipHash,
        actorId,
        evidence: `${rule.windowMinutes}분 내 서로 다른 전화번호 ${fingerprints.size}개로 조회`,
      });
    } catch (error) {
      console.error('[rules] ANO_LOOKUP_BF 기록 실패:', error);
    }
  });
}
