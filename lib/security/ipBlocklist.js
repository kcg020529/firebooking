import { createServerClient } from '../supabase.js';
import { createCloudflareIpBlock, deleteCloudflareIpBlock } from './cloudflareFirewall.js';
import { decryptIncidentIp, hashIp } from './hash.js';
import { createMaskedEvidence } from './pii.js';

const BLOCK_FIELDS = 'id, ip_hash, source_event_id, status, is_active, block_type, reason, cloudflare_rule_id, blocked_requests, created_at, released_at, sync_error';

function toBlock(row) {
  if (!row) return null;
  return {
    id: row.id,
    ipHash: row.ip_hash,
    sourceEventId: row.source_event_id,
    status: row.status,
    isActive: row.is_active,
    blockType: row.block_type,
    reason: row.reason,
    cloudflareRuleId: row.cloudflare_rule_id,
    blockedRequests: row.blocked_requests,
    createdAt: row.created_at,
    releasedAt: row.released_at,
    syncError: row.sync_error,
  };
}

export function createIpBlocklistRepository(client = createServerClient()) {
  return {
    async findActiveByHash(ipHash) {
      const { data, error } = await client.from('ip_blocklist').select(BLOCK_FIELDS)
        .eq('ip_hash', ipHash).eq('is_active', true).maybeSingle();
      if (error) throw error;
      return toBlock(data);
    },
    async createPending(values) {
      const { data, error } = await client.from('ip_blocklist').insert({
        ip_hash: values.ipHash,
        source_event_id: values.sourceEventId,
        block_type: values.blockType,
        reason: values.reason,
        blocked_by: values.actorId,
        status: 'applying',
        is_active: true,
      }).select(BLOCK_FIELDS).single();
      if (error) throw error;
      return toBlock(data);
    },
    async markActive(id, ruleId) {
      const { data, error } = await client.from('ip_blocklist').update({
        status: 'active', cloudflare_rule_id: ruleId, sync_error: null,
      }).eq('id', id).select(BLOCK_FIELDS).single();
      if (error) throw error;
      return toBlock(data);
    },
    async markSyncError(id) {
      const { data, error } = await client.from('ip_blocklist').update({
        status: 'sync_error', sync_error: 'Cloudflare 동기화 실패',
      }).eq('id', id).select(BLOCK_FIELDS).single();
      if (error) throw error;
      return toBlock(data);
    },
    async getById(id) {
      const { data, error } = await client.from('ip_blocklist').select(BLOCK_FIELDS)
        .eq('id', id).maybeSingle();
      if (error) throw error;
      return toBlock(data);
    },
    async release(id, actorId) {
      const { data, error } = await client.from('ip_blocklist').update({
        status: 'released', is_active: false, released_by: actorId, released_at: new Date().toISOString(), sync_error: null,
      }).eq('id', id).select(BLOCK_FIELDS).single();
      if (error) throw error;
      return toBlock(data);
    },
    async incrementBlocked(id) {
      const { error } = await client.rpc('increment_ip_block_count', { p_block_id: id });
      if (error) throw error;
    },
    async list() {
      const { data, error } = await client.from('ip_blocklist').select(BLOCK_FIELDS)
        .order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return (data ?? []).map(toBlock);
    },
  };
}

export async function checkIpBlock({ ipHash, repository = createIpBlocklistRepository() }) {
  if (!ipHash) return { blocked: false };
  const block = await repository.findActiveByHash(ipHash);
  if (!block) return { blocked: false };
  await repository.incrementBlocked(block.id).catch(() => {});
  return { blocked: true, block };
}

export async function blockIp({
  ip,
  ipHash,
  reason,
  sourceEventId = null,
  actorId = null,
  blockType = 'manual',
  repository = createIpBlocklistRepository(),
  createFirewallBlock = createCloudflareIpBlock,
}) {
  if (!ip || !ipHash) throw new Error('IP_BLOCK_INPUT_REQUIRED');
  const existing = await repository.findActiveByHash(ipHash);
  if (existing) return existing;

  const pending = await repository.createPending({
    ipHash,
    sourceEventId,
    actorId,
    blockType,
    reason: createMaskedEvidence(reason, 200),
  });

  try {
    const { ruleId } = await createFirewallBlock({
      ip,
      note: `firebooking block ${pending.id}${sourceEventId ? ` event ${sourceEventId}` : ''}`,
    });
    return repository.markActive(pending.id, ruleId);
  } catch (error) {
    console.error('[ipBlocklist] Cloudflare 차단 동기화 실패:', { code: error?.message });
    return repository.markSyncError(pending.id);
  }
}

export async function unblockIp({
  blockId,
  actorId,
  repository = createIpBlocklistRepository(),
  deleteFirewallBlock = deleteCloudflareIpBlock,
}) {
  const id = Number(blockId);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('INVALID_BLOCK_ID');
  const block = await repository.getById(id);
  if (!block) throw new Error('IP_BLOCK_NOT_FOUND');
  if (!block.isActive) return block;
  if (block.cloudflareRuleId) {
    await deleteFirewallBlock({ ruleId: block.cloudflareRuleId });
  }
  return repository.release(id, actorId ?? null);
}

export async function blockSecurityEventIp({
  eventId,
  reason,
  actorId,
  client = createServerClient(),
}) {
  const id = Number(eventId);
  const { data, error } = await client.from('security_events')
    .select('id, severity, ip_ciphertext, ip_expires_at')
    .eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data || data.severity !== 'critical' || !data.ip_ciphertext) {
    return { ok: false, status: 404, error: '차단에 사용할 사고 IP가 없습니다.' };
  }
  if (!data.ip_expires_at || new Date(data.ip_expires_at) <= new Date()) {
    return { ok: false, status: 410, error: '사고 IP 보관 기간이 만료됐습니다.' };
  }
  const ip = decryptIncidentIp(data.ip_ciphertext);
  const block = await blockIp({
    ip,
    ipHash: hashIp(ip),
    reason,
    sourceEventId: id,
    actorId,
    repository: createIpBlocklistRepository(client),
  });
  return { ok: true, block };
}

export async function listIpBlocks(client = createServerClient()) {
  return createIpBlocklistRepository(client).list();
}

