import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createCloudflareIpBlock,
  deleteCloudflareIpBlock,
} from '../../lib/security/cloudflareFirewall.js';

const env = {
  CLOUDFLARE_API_TOKEN: 'test-token',
  CLOUDFLARE_ZONE_ID: 'zone-id',
};

test('Cloudflare IP 차단 규칙을 서버 토큰으로 생성한다', async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return Response.json({ success: true, result: { id: 'cf-rule-1' } });
  };

  const result = await createCloudflareIpBlock({
    ip: '203.0.113.10',
    note: 'firebooking event 42',
    env,
    fetchImpl,
  });

  assert.equal(result.ruleId, 'cf-rule-1');
  assert.match(request.url, /zones\/zone-id\/firewall\/access_rules\/rules$/);
  assert.equal(request.options.headers.Authorization, 'Bearer test-token');
  assert.equal(JSON.parse(request.options.body).configuration.value, '203.0.113.10');
});

test('Cloudflare 규칙 ID로 차단을 해제한다', async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return Response.json({ success: true, result: { id: 'cf-rule-1' } });
  };

  await deleteCloudflareIpBlock({ ruleId: 'cf-rule-1', env, fetchImpl });
  assert.equal(request.options.method, 'DELETE');
  assert.match(request.url, /rules\/cf-rule-1$/);
});

test('Cloudflare 설정이 없거나 API가 실패하면 성공으로 처리하지 않는다', async () => {
  await assert.rejects(
    () => createCloudflareIpBlock({ ip: '203.0.113.10', env: {}, fetchImpl: fetch }),
    /CLOUDFLARE_FIREWALL_NOT_CONFIGURED/,
  );
  await assert.rejects(
    () => createCloudflareIpBlock({
      ip: '203.0.113.10',
      env,
      fetchImpl: async () => Response.json({ success: false, errors: [] }, { status: 403 }),
    }),
    /CLOUDFLARE_FIREWALL_REQUEST_FAILED/,
  );
});

