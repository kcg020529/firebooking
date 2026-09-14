import test from 'node:test';
import assert from 'node:assert/strict';

import * as hashSecurity from '../../lib/security/hash.js';

const { getClientIp, hashSecurityValue } = hashSecurity;

function createRequest(headers = {}, url = 'https://firebooking.example/api/test') {
  return {
    url,
    method: 'POST',
    headers: new Headers(headers),
  };
}

test('탐지용 지문은 원문 없이 동일 값을 비교할 수 있다', () => {
  const previousSalt = process.env.IP_HASH_SALT;
  process.env.IP_HASH_SALT = 'test-only-salt';

  try {
    const first = hashSecurityValue('01012345678');
    const second = hashSecurityValue('01012345678');
    const different = hashSecurityValue('01099999999');

    assert.equal(first, second);
    assert.notEqual(first, different);
    assert.equal(first.includes('01012345678'), false);
  } finally {
    if (previousSalt === undefined) delete process.env.IP_HASH_SALT;
    else process.env.IP_HASH_SALT = previousSalt;
  }
});

const ORIGIN_SECRET = 'test-only-cloudflare-origin-secret';
const ORIGIN_ENV = { CLOUDFLARE_ORIGIN_SECRET: ORIGIN_SECRET };

test('비밀 헤더가 일치하면 Cloudflare가 전달한 cf-connecting-ip을 최우선으로 사용한다', () => {
  const request = createRequest({
    'x-firebooking-origin': ORIGIN_SECRET,
    'cf-connecting-ip': '203.0.113.27',
    'x-vercel-forwarded-for': '198.51.100.10',
    'x-forwarded-for': '192.0.2.5',
  });

  assert.equal(hashSecurity.isFromCloudflare(request, ORIGIN_ENV), true);
  assert.equal(getClientIp(request, ORIGIN_ENV), '203.0.113.27');
});

test('비밀 헤더 없이 보낸 cf-connecting-ip은 위조로 보고 Vercel이 본 IP를 사용한다', () => {
  const request = createRequest({
    'cf-connecting-ip': '203.0.113.27',
    'x-vercel-forwarded-for': '198.51.100.10',
  });

  assert.equal(hashSecurity.isFromCloudflare(request, ORIGIN_ENV), false);
  assert.equal(getClientIp(request, ORIGIN_ENV), '198.51.100.10');
});

test('비밀 헤더 값이 다르면 cf-connecting-ip을 무시한다', () => {
  const request = createRequest({
    'x-firebooking-origin': 'guessed-secret',
    'cf-connecting-ip': '203.0.113.27',
    'x-vercel-forwarded-for': '198.51.100.10',
  });

  assert.equal(hashSecurity.isFromCloudflare(request, ORIGIN_ENV), false);
  assert.equal(getClientIp(request, ORIGIN_ENV), '198.51.100.10');
});

test('서버에 비밀값이 없으면 비밀 헤더가 와도 Cloudflare 헤더를 믿지 않는다', () => {
  const request = createRequest({
    'x-firebooking-origin': ORIGIN_SECRET,
    'cf-connecting-ip': '203.0.113.27',
    'x-vercel-forwarded-for': '198.51.100.10',
  });

  assert.equal(hashSecurity.isFromCloudflare(request, {}), false);
  assert.equal(getClientIp(request, {}), '198.51.100.10');
});

test('Cloudflare 헤더가 없으면 Vercel이 보증한 IP를 사용한다', () => {
  const request = createRequest({
    'x-vercel-forwarded-for': '198.51.100.10',
    'x-forwarded-for': '192.0.2.5',
  });

  assert.equal(getClientIp(request), '198.51.100.10');
});

test('유효하지 않은 Cloudflare IP 값은 무시하고 다음 신뢰 헤더를 사용한다', () => {
  const request = createRequest({
    'cf-connecting-ip': 'attacker-controlled-value',
    'x-vercel-forwarded-for': '198.51.100.10',
  });

  assert.equal(getClientIp(request), '198.51.100.10');
});

test('유효한 IP 헤더가 하나도 없으면 원본 IP를 수집하지 않는다', () => {
  const request = createRequest({
    'cf-connecting-ip': 'not-an-ip',
    'x-vercel-forwarded-for': 'also-invalid',
    'x-forwarded-for': 'unknown',
  });

  assert.equal(getClientIp(request), null);
});

test('보안 알림용 네트워크 컨텍스에 IP·국가·경로·User-Agent를 담는다', () => {
  const request = createRequest({
    'x-firebooking-origin': ORIGIN_SECRET,
    'cf-connecting-ip': '203.0.113.27',
    'cf-ipcountry': 'kr',
    'user-agent': 'Security Test Agent/1.0',
  }, 'https://firebooking.example/api/auth/login?ignored=true');

  assert.equal(typeof hashSecurity.getClientNetworkContext, 'function');
  assert.deepEqual(hashSecurity.getClientNetworkContext(request, ORIGIN_ENV), {
    ip: '203.0.113.27',
    country: 'KR',
    method: 'POST',
    path: '/api/auth/login',
    userAgent: 'Security Test Agent/1.0',
  });
});

test('Cloudflare를 거치지 않은 요청의 IP·국가 헤더는 위조로 보고 Vercel 값을 사용한다', () => {
  const request = createRequest({
    'cf-connecting-ip': '203.0.113.27',
    'cf-ipcountry': 'us',
    'x-vercel-forwarded-for': '198.51.100.10',
    'x-vercel-ip-country': 'kr',
    'user-agent': 'Security Test Agent/1.0',
  }, 'https://firebooking.example/api/health');

  assert.deepEqual(hashSecurity.getClientNetworkContext(request, ORIGIN_ENV), {
    ip: '198.51.100.10',
    country: 'KR',
    method: 'POST',
    path: '/api/health',
    userAgent: 'Security Test Agent/1.0',
  });
});

test('critical 사고 IP는 AES-256-GCM으로 암호화하고 다시 복호화할 수 있다', () => {
  assert.equal(typeof hashSecurity.encryptIncidentIp, 'function');
  assert.equal(typeof hashSecurity.decryptIncidentIp, 'function');

  const env = {
    SECURITY_IP_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
  };
  const encrypted = hashSecurity.encryptIncidentIp('203.0.113.27', env);

  assert.match(encrypted, /^v1:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/);
  assert.equal(encrypted.includes('203.0.113.27'), false);
  assert.equal(hashSecurity.decryptIncidentIp(encrypted, env), '203.0.113.27');
});

test('암호화된 사고 IP가 변조되면 복호화를 거부한다', () => {
  assert.equal(typeof hashSecurity.encryptIncidentIp, 'function');
  assert.equal(typeof hashSecurity.decryptIncidentIp, 'function');

  const env = {
    SECURITY_IP_ENCRYPTION_KEY: Buffer.alloc(32, 11).toString('base64'),
  };
  const encrypted = hashSecurity.encryptIncidentIp('198.51.100.10', env);
  const parts = encrypted.split(':');
  parts[3] = `${parts[3].startsWith('A') ? 'B' : 'A'}${parts[3].slice(1)}`;
  const tampered = parts.join(':');

  assert.throws(() => hashSecurity.decryptIncidentIp(tampered, env));
});

test('사고 IP 보관 만료 시각은 발생 시각으로부터 30일 후다', () => {
  assert.equal(typeof hashSecurity.getIncidentIpExpiry, 'function');

  const occurredAt = new Date('2026-09-14T00:00:00.000Z');
  assert.equal(
    hashSecurity.getIncidentIpExpiry(occurredAt),
    '2026-10-14T00:00:00.000Z',
  );
});
