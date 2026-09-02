import { createHash } from 'node:crypto';

/**
 * IP 해시.
 *
 * 원본 IP 도 개인정보다. api_logs · audit_logs · security_events 에는
 * 해시만 저장한다. 솔트가 없으면 IP 대역이 좁아 원본을 역산할 수 있으므로
 * IP_HASH_SALT 를 반드시 섞는다.
 *
 * 같은 IP 는 항상 같은 해시가 되므로 "동일 IP 가 10회 조회" 같은
 * 이상 탐지는 그대로 가능하다.
 */
export function hashIp(ip) {
  if (!ip) return null;

  const salt = process.env.IP_HASH_SALT;
  if (!salt) {
    // 솔트 없이 해시하면 무염 해시라 역산이 쉽다. 조용히 넘어가지 않는다.
    throw new Error('IP_HASH_SALT 환경변수가 없습니다.');
  }

  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
}

/**
 * 요청에서 클라이언트 IP 를 뽑는다.
 * Vercel 은 x-forwarded-for 맨 앞에 실제 클라이언트 IP 를 넣는다.
 */
export function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? null;
}
