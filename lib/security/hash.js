import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { isIP } from 'node:net';

const INCIDENT_IP_CIPHER_VERSION = 'v1';
const INCIDENT_IP_AAD = Buffer.from('firebooking:security-event-ip:v1');
const INCIDENT_IP_RETENTION_DAYS = 30;

function getFirstValidIp(headerValue) {
  if (typeof headerValue !== 'string') return null;

  for (const candidate of headerValue.split(',')) {
    const value = candidate.trim();
    if (isIP(value)) return value;
  }
  return null;
}

function getIncidentEncryptionKey(env = process.env) {
  const encodedKey = env.SECURITY_IP_ENCRYPTION_KEY?.trim();
  if (!encodedKey) {
    throw new Error('SECURITY_IP_ENCRYPTION_KEY 환경변수가 없습니다.');
  }

  const key = Buffer.from(encodedKey, 'base64');
  if (key.length !== 32) {
    throw new Error('SECURITY_IP_ENCRYPTION_KEY는 32바이트 Base64 키여야 합니다.');
  }
  return key;
}

/**
 * IP 해시.
 *
 * 원본 IP 도 개인정보다. api_logs · audit_logs에는 해시만 저장한다.
 * critical security_events만 별도 암호문을 30일 보관한다. 솔트가 없으면
 * IP 대역이 좁아 원본을 역산할 수 있으므로 IP_HASH_SALT를 반드시 섞는다.
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

/** 탐지용 개인정보 지문. 원문을 저장하지 않고 동일 값 여부만 비교한다. */
export function hashSecurityValue(value) {
  if (typeof value !== 'string' || value.length === 0) return null;

  const salt = process.env.IP_HASH_SALT;
  if (!salt) {
    throw new Error('IP_HASH_SALT 환경변수가 없습니다.');
  }

  return createHash('sha256')
    .update(`${salt}:security-value:${value}`)
    .digest('hex')
    .slice(0, 32);
}

/**
 * 요청에서 클라이언트 IP 를 뽑는다.
 * Cloudflare 프록시를 거친 요청은 cf-connecting-ip을 최우선으로 쓴다.
 * Cloudflare 헤더가 없으면 Vercel이 추가한 헤더로 내려간다.
 */
export function getClientIp(request) {
  const candidates = [
    request.headers.get('cf-connecting-ip'),
    request.headers.get('x-vercel-forwarded-for'),
    request.headers.get('x-forwarded-for'),
    request.headers.get('x-real-ip'),
  ];

  for (const candidate of candidates) {
    const ip = getFirstValidIp(candidate);
    if (ip) return ip;
  }
  return null;
}

/** Discord 알림과 사고 IP 보관에 필요한 요청 정보를 한 번에 추출한다. */
export function getClientNetworkContext(request) {
  const requestUrl = new URL(request.url);
  const country = request.headers.get('cf-ipcountry')
    ?? request.headers.get('x-vercel-ip-country')
    ?? 'UNKNOWN';

  return {
    ip: getClientIp(request),
    country: country.toUpperCase(),
    method: request.method,
    path: requestUrl.pathname,
    userAgent: request.headers.get('user-agent') ?? 'UNKNOWN',
  };
}

/** critical 사고의 원본 IP를 인증된 AES-256-GCM 형식으로 암호화한다. */
export function encryptIncidentIp(ip, env = process.env) {
  if (typeof ip !== 'string' || !ip.trim()) {
    throw new Error('암호화할 IP가 없습니다.');
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getIncidentEncryptionKey(env), iv);
  cipher.setAAD(INCIDENT_IP_AAD);
  const ciphertext = Buffer.concat([
    cipher.update(ip.trim(), 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    INCIDENT_IP_CIPHER_VERSION,
    iv.toString('base64url'),
    authTag.toString('base64url'),
    ciphertext.toString('base64url'),
  ].join(':');
}

/** 관리자 사후 조사에서만 사용할 사고 IP 복호화 함수. */
export function decryptIncidentIp(value, env = process.env) {
  if (typeof value !== 'string') throw new Error('암호문 형식이 올바르지 않습니다.');

  const [version, ivValue, tagValue, ciphertextValue] = value.split(':');
  if (version !== INCIDENT_IP_CIPHER_VERSION || !ivValue || !tagValue || !ciphertextValue) {
    throw new Error('암호문 형식이 올바르지 않습니다.');
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    getIncidentEncryptionKey(env),
    Buffer.from(ivValue, 'base64url'),
  );
  decipher.setAAD(INCIDENT_IP_AAD);
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

/** critical 사고 IP는 발생 시각부터 30일만 보관한다. */
export function getIncidentIpExpiry(occurredAt = new Date()) {
  const expiry = new Date(occurredAt);
  if (Number.isNaN(expiry.getTime())) throw new Error('사고 시각이 올바르지 않습니다.');
  expiry.setUTCDate(expiry.getUTCDate() + INCIDENT_IP_RETENTION_DAYS);
  return expiry.toISOString();
}
