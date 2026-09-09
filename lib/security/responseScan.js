import { createMaskedEvidence, detectAndMaskPii } from './pii.js';
import { scanForSecrets } from './leak.js';

/** Inspect an API response body without retaining the response itself. */
export function inspectResponseBody(value) {
  const text = typeof value === 'string' ? value : '';
  const piiResult = detectAndMaskPii(text);

  return {
    secretHits: scanForSecrets(text),
    piiHits: piiResult.hits,
  };
}

export function buildPiiSecurityEvents({
  method,
  path,
  hits,
  actorId = null,
  ipHash = null,
}) {
  if (!Array.isArray(hits) || hits.length === 0) {
    return [];
  }

  const evidence = createMaskedEvidence(
    `${method ?? 'UNKNOWN'} ${path ?? ''} response contained a PII pattern`,
    200,
  );

  return hits.map((hit) => ({
    rule_id: hit.ruleId,
    category: 'pii',
    severity: hit.severity,
    actor_id: actorId,
    ip_hash: ipHash,
    evidence,
  }));
}
