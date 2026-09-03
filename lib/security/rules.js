import { after } from 'next/server';
import { createServerClient } from '@/lib/supabase';

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

export const ANOMALY_RULES = {
  /**
   * ANO_CODE_ENUM — 예약번호 순회(IDOR) 시도.
   *
   * 예약번호는 'GB-' + 5글자다. 무작위로 대입하면 남의 예약에서
   * 이름·전화번호를 긁어갈 수 있다. 맞힌 횟수가 아니라 "빗나간 횟수"를
   * 세는 게 핵심이다 — 정상 사용자는 자기 번호를 틀리게 여러 번 넣지 않는다.
   */
  ANO_CODE_ENUM: {
    id: 'ANO_CODE_ENUM',
    category: 'anomaly',
    severity: 'critical',
    windowMinutes: 10,
    threshold: 5,
    description: '존재하지 않는 예약번호 조회 반복',
  },

  /**
   * ANO_LOOKUP_BF — 전화번호 대입.
   *
   * 이름+전화번호 조합으로 조회할 수 있으므로, 같은 IP 가 서로 다른
   * 번호를 계속 바꿔가며 시도하면 대입 공격이다.
   * 실패/성공을 가리지 않고 "서로 다른 번호를 몇 개나 시도했나"를 센다.
   */
  ANO_LOOKUP_BF: {
    id: 'ANO_LOOKUP_BF',
    category: 'anomaly',
    severity: 'critical',
    windowMinutes: 10,
    threshold: 10,
    description: '서로 다른 전화번호로 조회 반복',
  },
};

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
export function detectCodeEnumeration({ ipHash, actorId, action }) {
  if (!ipHash) return;

  const rule = ANOMALY_RULES.ANO_CODE_ENUM;

  after(async () => {
    try {
      const supabase = createServerClient();

      const failures = await countRecentDenies(supabase, {
        ipHash,
        action,
        windowMinutes: rule.windowMinutes,
      });

      if (failures < rule.threshold) return;

      // 이미 같은 창에서 기록했으면 다시 남기지 않는다.
      // 안 그러면 6회, 7회, 8회… 마다 이벤트가 쌓여 대시보드가 도배된다.
      const since = new Date(Date.now() - rule.windowMinutes * 60_000).toISOString();
      const { count: alreadyLogged } = await supabase
        .from('security_events')
        .select('id', { count: 'exact', head: true })
        .eq('rule_id', rule.id)
        .eq('ip_hash', ipHash)
        .gte('ts', since);

      if (alreadyLogged > 0) return;

      await supabase.from('security_events').insert({
        rule_id: rule.id,
        category: rule.category,
        severity: rule.severity,
        actor_id: actorId ?? null,
        ip_hash: ipHash,
        // ★ 시도한 예약번호 자체는 남기지 않는다. 횟수만으로 충분하다.
        evidence: `${rule.windowMinutes}분 내 존재하지 않는 예약번호 조회 ${failures}회`,
      });
    } catch (error) {
      console.error('[rules] ANO_CODE_ENUM 기록 실패:', error);
    }
  });
}
