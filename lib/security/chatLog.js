import { createMaskedEvidence, detectAndMaskPii } from "./pii.js";

function getConfiguration() {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!baseUrl || !serviceRoleKey) {
    throw new Error("SECURITY_LOG_UNAVAILABLE");
  }

  return { baseUrl, serviceRoleKey };
}

async function insertRows(table, rows, fetchImpl = fetch) {
  const { baseUrl, serviceRoleKey } = getConfiguration();
  const url = new URL(`/rest/v1/${table}`, baseUrl);
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(rows),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("SECURITY_LOG_WRITE_FAILED");
  }
}

export async function recordChatLog(
  { sessionId, role, content, piiHits },
  fetchImpl = fetch,
) {
  const { maskedText, hits } = detectAndMaskPii(content);
  const detectedPiiHits = hits.reduce((total, hit) => total + hit.count, 0);
  const safePiiHits = Number.isInteger(piiHits) && piiHits >= 0
    ? piiHits
    : detectedPiiHits;

  await insertRows(
    "chat_logs",
    [
      {
        session_id: sessionId,
        role,
        content_masked: maskedText,
        pii_hits: safePiiHits,
      },
    ],
    fetchImpl,
  );
}

export async function recordSecurityEvents(
  { hits, category, evidence, actorId = null, ipHash = null },
  fetchImpl = fetch,
) {
  if (!Array.isArray(hits) || hits.length === 0) {
    return;
  }

  const maskedEvidence = createMaskedEvidence(evidence);
  const rows = hits.map((hit) => ({
    rule_id: hit.ruleId,
    category,
    severity: hit.severity,
    actor_id: actorId,
    ip_hash: ipHash,
    evidence: maskedEvidence,
  }));

  await insertRows("security_events", rows, fetchImpl);
}
