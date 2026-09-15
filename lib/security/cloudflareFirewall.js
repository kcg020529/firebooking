function getConfiguration(env) {
  const token = env.CLOUDFLARE_API_TOKEN;
  const zoneId = env.CLOUDFLARE_ZONE_ID;
  if (!token || !zoneId) throw new Error('CLOUDFLARE_FIREWALL_NOT_CONFIGURED');
  return { token, zoneId };
}

async function callCloudflare(path, options, { env = process.env, fetchImpl = fetch } = {}) {
  const { token, zoneId } = getConfiguration(env);
  const response = await fetchImpl(
    `https://api.cloudflare.com/client/v4/zones/${encodeURIComponent(zoneId)}${path}`,
    {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      cache: 'no-store',
    },
  );
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    throw new Error('CLOUDFLARE_FIREWALL_REQUEST_FAILED');
  }
  return data.result;
}

/** Zone IP Access Rule을 만들어 Vercel 도달 전에 해당 IP를 차단한다. */
export async function createCloudflareIpBlock({ ip, note, env = process.env, fetchImpl = fetch }) {
  const result = await callCloudflare('/firewall/access_rules/rules', {
    method: 'POST',
    body: JSON.stringify({
      mode: 'block',
      configuration: { target: 'ip', value: ip },
      notes: String(note || 'firebooking security response').slice(0, 100),
    }),
  }, { env, fetchImpl });
  if (!result?.id) throw new Error('CLOUDFLARE_FIREWALL_INVALID_RESPONSE');
  return { ruleId: result.id };
}

/** 저장해 둔 Cloudflare 규칙 ID를 삭제해 방화벽 차단을 해제한다. */
export async function deleteCloudflareIpBlock({ ruleId, env = process.env, fetchImpl = fetch }) {
  if (!ruleId) throw new Error('CLOUDFLARE_FIREWALL_RULE_ID_REQUIRED');
  await callCloudflare(`/firewall/access_rules/rules/${encodeURIComponent(ruleId)}`, {
    method: 'DELETE',
  }, { env, fetchImpl });
  return { ok: true };
}

export function isCloudflareFirewallConfigured(env = process.env) {
  return Boolean(env.CLOUDFLARE_API_TOKEN && env.CLOUDFLARE_ZONE_ID);
}

