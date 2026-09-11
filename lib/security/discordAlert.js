import { createMaskedEvidence } from './pii.js';
import { SECRET_PATTERNS } from './leak.js';

/** 동일 이벤트(규칙+증거) 연속 발송을 억제하는 메모리 캐시 */
const alertDeduplicationCache = new Map();

/** 기본 중복 억제 시간: 5분 (300,000ms) */
const DEFAULT_SUPPRESSION_WINDOW_MS = 5 * 60 * 1000;

/** 기본 네트워크 타임아웃: 3초 */
const DEFAULT_TIMEOUT_MS = 3000;

/** Discord 웹훅 URL 패턴 */
const DISCORD_WEBHOOK_PATTERN = /https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\S+/gi;

/** Bearer 토큰 패턴 */
const BEARER_TOKEN_PATTERN = /Bearer\s+[A-Za-z0-9._~+/-]+=*/gi;

/**
 * Discord 웹훅 환경변수 설정 여부를 확인한다.
 * @param {object} [env=process.env]
 * @returns {boolean}
 */
export function isDiscordAlertConfigured(env = process.env) {
  return Boolean(env.DISCORD_SECURITY_WEBHOOK_URL?.trim());
}

/**
 * Discord 전송 전 증거 문자열에서 PII 및 비밀값을 철저히 마스킹/절단한다.
 * - 최대 200자 제한
 * - PII(이름, 전화번호, 이메일, 주민번호, 카드번호) 마스킹
 * - API 키, JWT 등 비밀 패턴 제거
 * - 웹훅 URL 자체 및 Bearer 토큰 노출 방지
 *
 * @param {any} evidence
 * @param {object} [env=process.env]
 * @returns {string}
 */
export function sanitizeEvidence(evidence, env = process.env) {
  if (typeof evidence !== 'string' || !evidence.trim()) {
    return '(상세 증거 없음)';
  }

  // 1. 기존 PII 마스킹 함수 재사용 (200자 제한)
  let safe = createMaskedEvidence(evidence, 200);

  // 2. Webhook URL 자체 및 일반 Discord Webhook 패턴 제거
  const webhookUrl = env.DISCORD_SECURITY_WEBHOOK_URL?.trim();
  if (webhookUrl && safe.includes(webhookUrl)) {
    safe = safe.replaceAll(webhookUrl, '[REDACTED_WEBHOOK]');
  }
  safe = safe.replace(DISCORD_WEBHOOK_PATTERN, '[REDACTED_WEBHOOK]');

  // 3. DeepSeek 키 원문 제거 (구체적 키 우선 매칭)
  const deepSeekKey = env.DEEPSEEK_API_KEY?.trim();
  if (deepSeekKey && deepSeekKey.length >= 16 && safe.includes(deepSeekKey)) {
    safe = safe.replaceAll(deepSeekKey, '[REDACTED_KEY]');
  }

  // 4. SECRET_PATTERNS (JWT, API키, service_role 등) 제거
  for (const { re } of SECRET_PATTERNS) {
    safe = safe.replace(re, '[REDACTED_SECRET]');
  }

  // 5. Bearer 인증 토큰 패턴 제거
  safe = safe.replace(BEARER_TOKEN_PATTERN, 'Bearer [REDACTED_TOKEN]');

  return safe.slice(0, 200);
}

/**
 * Discord Embed 페이로드를 생성한다.
 * IP, actor_id, 세션 정보는 절대 포함하지 않는다.
 *
 * @param {object} event
 * @param {object} [options]
 * @returns {object}
 */
export function buildDiscordPayload(event, options = {}) {
  const ruleId = event.rule_id || event.ruleId || 'UNKNOWN';
  const category = event.category || 'security';
  const severity = event.severity || 'critical';
  const timestamp = event.ts || new Date().toISOString();
  const maskedEvidence = options.maskedEvidence || sanitizeEvidence(event.evidence, options.env);

  const fields = [
    { name: '규칙', value: String(ruleId), inline: true },
    { name: '분류', value: String(category), inline: true },
    { name: '심각도', value: String(severity), inline: true },
    { name: '발생 시각', value: String(timestamp), inline: false },
  ];

  return {
    username: 'Firebooking Security',
    embeds: [
      {
        title: '🚨 Firebooking 긴급 보안 경보',
        color: 0xdc2626, // Crimson red
        fields,
        description: maskedEvidence,
        footer: {
          text: '관리자 보안 대시보드에서 확인하세요.',
        },
      },
    ],
  };
}

/**
 * 중복 억제 캐시를 초기화한다 (테스트 지원).
 */
export function clearAlertDeduplicationCache() {
  alertDeduplicationCache.clear();
}

/**
 * 긴급 보안 이벤트(critical) 발생 시 Discord 채널로 웹훅 요약을 전송한다.
 *
 * @param {object} event - 보안 이벤트 객체
 * @param {object} [options]
 * @param {string} [options.webhookUrl] - 웹훅 URL (테스트용 주입 가능)
 * @param {Function} [options.fetchImpl] - fetch 함수 (테스트용 주입 가능)
 * @param {Function} [options.now] - 현재 시각 함수 (테스트용 주입 가능)
 * @param {number} [options.timeoutMs] - 타임아웃 밀리초 (기본 3000ms)
 * @param {number} [options.suppressionWindowMs] - 중복 억제 윈도우 (기본 5분)
 * @param {Map} [options.cache] - 중복 억제 캐시 (기본 내부 Map)
 * @param {Function} [options.sleepImpl] - 재시도 대기 함수
 * @param {boolean} [options.retry=true] - 429/5xx 시 1회 재시도 여부
 * @returns {Promise<{ ok: boolean, skipped?: boolean, reason?: string, error?: string }>}
 */
export async function sendCriticalSecurityAlert(event, options = {}) {
  if (!event || typeof event !== 'object') {
    return { ok: false, error: 'invalid_event' };
  }

  // 1. critical 이벤트만 전송 (info, warn은 skip)
  if (event.severity !== 'critical') {
    return { ok: true, skipped: true, reason: 'non_critical' };
  }

  // 2. Webhook URL 확인 (미설정 시 조용히 skip)
  const env = options.env ?? process.env;
  const webhookUrl = (options.webhookUrl ?? env.DISCORD_SECURITY_WEBHOOK_URL ?? '').trim();
  if (!webhookUrl) {
    return { ok: true, skipped: true, reason: 'not_configured' };
  }

  // 3. 증거 마스킹 및 중복 억제 확인
  const ruleId = event.rule_id || event.ruleId || 'UNKNOWN';
  const maskedEvidence = sanitizeEvidence(event.evidence, env);
  const cacheKey = `${ruleId}:${maskedEvidence}`;

  const nowFn = options.now ?? Date.now;
  const currentTime = nowFn();
  const suppressionWindowMs = options.suppressionWindowMs ?? DEFAULT_SUPPRESSION_WINDOW_MS;
  const cache = options.cache ?? alertDeduplicationCache;

  const lastSent = cache.get(cacheKey);
  if (lastSent && currentTime - lastSent < suppressionWindowMs) {
    return { ok: true, skipped: true, reason: 'deduplicated' };
  }

  // 4. Discord Embed 페이로드 빌드
  const payload = buildDiscordPayload(event, { maskedEvidence, env });

  // 5. 서버 측 fetch 전송 (타임아웃 + 최대 1회 재시도)
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxAttempts = options.retry === false ? 1 : 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let response;
    try {
      let signal;
      if (typeof AbortSignal?.timeout === 'function') {
        signal = AbortSignal.timeout(timeoutMs);
      }

      response = await fetchImpl(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal,
      });
    } catch {
      // 네트워크 타임아웃 또는 연결 오류
      if (attempt < maxAttempts) {
        if (options.sleepImpl) await options.sleepImpl(100);
        continue;
      }
      console.error('[discordAlert] 알림 전송 실패:', { ruleId, code: 'NETWORK_ERROR' });
      return { ok: false, error: 'delivery_failed' };
    }

    if (response && response.ok) {
      // 성공 시 중복 억제 타임스탬프 갱신
      cache.set(cacheKey, currentTime);

      // 캐시 크기 관리 (1000개 초과 시 만료 항목 정리)
      if (cache.size > 1000) {
        for (const [key, timestamp] of cache.entries()) {
          if (currentTime - timestamp > suppressionWindowMs) {
            cache.delete(key);
          }
        }
      }

      return { ok: true, skipped: false };
    }

    // 429(Rate Limit) 또는 5xx(Discord 서버 장애) 시 1회 재시도 허용
    const status = response ? response.status : 0;
    if ((status === 429 || status >= 500) && attempt < maxAttempts) {
      if (options.sleepImpl) await options.sleepImpl(100);
      continue;
    }

    // 4xx 등 실패 처리 (URL이나 응답 본문은 절대 출력하지 않음)
    console.error('[discordAlert] 알림 전송 실패:', { ruleId, code: `HTTP_${status}` });
    return { ok: false, error: 'delivery_failed' };
  }

  return { ok: false, error: 'delivery_failed' };
}
