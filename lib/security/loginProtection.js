import { createHmac } from 'node:crypto';
import { createServerClient } from '../supabase.js';
import { recordSecurityEvent } from './events.js';
import { ANOMALY_RULES } from './securityConfig.js';

const LOGIN_RULE = ANOMALY_RULES.ANO_LOGIN_BF;
// 15분 동안 인증에 5번 실패하면 15분 동안 로그인을 잠급니다.
export const LOGIN_MAX_ATTEMPTS = LOGIN_RULE.threshold;
export const LOGIN_WINDOW_SECONDS = LOGIN_RULE.windowMinutes * 60;
export const LOGIN_LOCK_SECONDS = LOGIN_RULE.lockMinutes * 60;

function getSecuritySecret() {
  const secret = process.env.IP_HASH_SALT;
  if (!secret) throw new Error('IP_HASH_SALT 환경변수가 없습니다.');
  return secret;
}

/** 이메일·IP 원문을 DB에 남기지 않는 로그인 제한 키. */
export function createLoginLimitKey(email, ipHash) {
  // Supabase에는 HMAC 키만 저장하며, 원본 이메일과 IP는 제한 테이블에 저장하지 않습니다.
  const normalizedEmail = email.trim().toLowerCase();
  return createHmac('sha256', getSecuritySecret())
    .update(`login-limit:${normalizedEmail}:${ipHash ?? 'unknown'}`)
    .digest('hex');
}

function parseRpcResult(data, operation) {
  if (!data || typeof data !== 'object') {
    throw new Error(`${operation} 결과가 올바르지 않습니다.`);
  }
  return data;
}

/** 비밀번호 검증 전에 한 자리를 예약해 동시 요청 우회를 막는다. */
export async function reserveLoginAttempt(keyHash, client = createServerClient()) {
  // Supabase Auth 호출 전에 시도 슬롯을 예약해 동시에 들어온 요청이 제한을 우회하지 못하게 합니다.
  const { data, error } = await client.rpc('reserve_login_attempt', {
    p_key_hash: keyHash,
    p_max_attempts: LOGIN_MAX_ATTEMPTS,
    p_window_seconds: LOGIN_WINDOW_SECONDS,
  });

  if (error) throw error;
  return parseRpcResult(data, '로그인 시도 예약');
}

/** 예약한 시도를 성공·실패·취소로 확정한다. */
export async function finishLoginAttempt(
  keyHash,
  outcome,
  client = createServerClient()
) {
  // 예약된 시도를 성공, 인증 실패, 인증과 무관한 공급자 오류 중 하나로 확정합니다.
  const { data, error } = await client.rpc('finish_login_attempt', {
    p_key_hash: keyHash,
    p_outcome: outcome,
    p_max_attempts: LOGIN_MAX_ATTEMPTS,
    p_lock_seconds: LOGIN_LOCK_SECONDS,
  });

  if (error) throw error;
  return parseRpcResult(data, '로그인 시도 확정');
}

/** 잠금 안내 문구. 고정된 "15분" 대신 실제 남은 시간을 분 단위로 올림해 알려준다. */
export function createLoginLockedMessage(retryAfterSeconds) {
  const seconds = Number(retryAfterSeconds);
  const minutes = Number.isFinite(seconds) && seconds > 0
    ? Math.ceil(seconds / 60)
    : LOGIN_LOCK_SECONDS / 60;
  return `로그인 시도가 너무 많습니다. ${minutes}분 후 다시 시도해 주세요.`;
}

/** 서버 장애나 공급자 rate limit은 비밀번호 실패 횟수로 세지 않는다. */
export function isCredentialFailure(error) {
  // 공급자 장애와 rate limit 응답은 잘못된 비밀번호 실패로 집계하지 않습니다.
  return error?.code === 'invalid_credentials';
}

/** 같은 잠금 창에 ANO_LOGIN_BF 이벤트가 하나만 남도록 기록한다. */
export async function recordLoginLock({
  ipHash,
  keyHash = null,
  networkContext = null,
  client = createServerClient(),
}) {
  const since = new Date(Date.now() - LOGIN_WINDOW_SECONDS * 1000).toISOString();
  const { count, error: countError } = await client
    .from('security_events')
    .select('id', { count: 'exact', head: true })
    .eq('rule_id', LOGIN_RULE.id)
    .eq('ip_hash', ipHash)
    .gte('ts', since);

  if (countError) throw countError;
  if ((count ?? 0) > 0) return;

  await recordSecurityEvent({
    rule_id: LOGIN_RULE.id,
    category: LOGIN_RULE.category,
    severity: LOGIN_RULE.severity,
    ip_hash: ipHash,
    evidence: `${LOGIN_WINDOW_SECONDS / 60}분 내 로그인 실패 ${LOGIN_MAX_ATTEMPTS}회`,
    ...(keyHash ? { response_target_hash: keyHash } : {}),
  }, { client, networkContext });
}

/** 보안 이벤트가 가리키는 HMAC 제한 키의 로그인 잠금을 즉시 해제한다. */
export async function clearLoginLock({ eventId, client = createServerClient() }) {
  const id = Number(eventId);
  if (!Number.isSafeInteger(id) || id < 1) {
    return { ok: false, status: 400, error: '이벤트 ID가 올바르지 않습니다.' };
  }
  const { data, error } = await client.from('security_events')
    .select('rule_id, response_target_hash').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data || data.rule_id !== LOGIN_RULE.id || !data.response_target_hash) {
    return { ok: false, status: 409, error: '해제할 로그인 잠금 정보가 없습니다.' };
  }
  const { error: deleteError } = await client.from('login_attempt_limits')
    .delete().eq('key_hash', data.response_target_hash);
  if (deleteError) throw deleteError;
  return { ok: true };
}
