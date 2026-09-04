import { createChatService } from "../../../lib/ai/chatService.js";
import { createDeepSeekGenerator } from "../../../lib/ai/deepseek.js";
import { createChatToolDependencies } from "../../../lib/ai/toolDependencies.js";
import { withApiLog } from "../../../lib/security/apiLog.js";
import {
  AUDIT_ACTIONS,
  recordAudit,
} from "../../../lib/security/audit.js";
import {
  recordChatLog,
  recordSecurityEvents,
} from "../../../lib/security/chatLog.js";
import { getClientIp, hashIp } from "../../../lib/security/hash.js";
import { detectCodeEnumeration } from "../../../lib/security/rules.js";

function recordBookingAudit(request, { input, result }, actor) {
  recordAudit(request, {
    action: AUDIT_ACTIONS.BOOKING_CREATE,
    result: result.ok ? "allow" : "deny",
    targetType: result.ok ? "booking" : "slot",
    targetId: result.ok
      ? result.booking?.bookingCode ?? null
      : typeof input.slotId === "string"
        ? input.slotId
        : null,
    actorId: actor.userId,
    resolveActorRole: actor.resolveRole,
  });
}

function recordLookupAudit(request, { result }, actor, ipHash) {
  recordAudit(request, {
    action: AUDIT_ACTIONS.BOOKING_LOOKUP,
    result: result.ok ? "allow" : "deny",
    targetType: "booking",
    targetId: result.ok ? result.bookings?.[0]?.bookingCode ?? null : null,
    actorId: actor.userId,
    resolveActorRole: actor.resolveRole,
  });

  if (!result.ok) {
    detectCodeEnumeration({
      ipHash,
      actorId: actor.userId,
      action: AUDIT_ACTIONS.BOOKING_LOOKUP,
    });
  }
}

function createRequestChatService(request, actor, ipHash) {
  const toolDependencies = createChatToolDependencies({
    onBookingResult: (entry) => recordBookingAudit(request, entry, actor),
    onLookupResult: (entry) => recordLookupAudit(request, entry, actor, ipHash),
  });

  return createChatService({
    generateReply: createDeepSeekGenerator(toolDependencies),
    recordChatLog,
    recordSecurityEvents,
  });
}

function recordChatAudit(request, { result, actor = null }) {
  recordAudit(request, {
    action: AUDIT_ACTIONS.CHAT_MESSAGE,
    result,
    targetType: "chat_session",
    actorId: actor?.userId ?? null,
    resolveActorRole: actor?.resolveRole,
  });
}

async function handlePost(request, { getUser, getUserId }) {
  let body;

  try {
    body = await request.json();
  } catch {
    recordChatAudit(request, { result: "deny" });
    return Response.json(
      { ok: false, error: "요청 본문이 올바른 JSON이 아니에요." },
      { status: 400 },
    );
  }

  const clientIp = getClientIp(request);
  const ipHash = clientIp ? hashIp(clientIp) : null;

  // 챗봇은 역할로 갈리는 기능이 없다. 기록용 id 만 응답 전에 확정하고,
  // 감사 로그의 역할은 응답 이후에 채운다.
  // 조회 실패는 비로그인으로 처리하되 보안 검사는 그대로 진행한다.
  const actor = {
    userId: await getUserId(),
    resolveRole: async () => (await getUser())?.role,
  };

  const handleChat = createRequestChatService(request, actor, ipHash);
  const result = await handleChat({
    sessionId: body?.sessionId,
    messages: body?.messages,
    actorId: actor.userId,
    ipHash,
  });

  recordChatAudit(request, {
    result: result.ok && !result.blocked ? "allow" : "deny",
    actor,
  });

  const { status, ...payload } = result;

  return Response.json(payload, { status });
}

export const POST = withApiLog(handlePost);
