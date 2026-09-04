import { createChatService } from "../../../lib/ai/chatService.js";
import { createDeepSeekGenerator } from "../../../lib/ai/deepseek.js";
import { createChatToolDependencies } from "../../../lib/ai/toolDependencies.js";
import { getCurrentUser } from "../../../lib/auth.js";
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

function recordBookingAudit(request, { input, result }, user) {
  recordAudit(request, {
    action: AUDIT_ACTIONS.BOOKING_CREATE,
    result: result.ok ? "allow" : "deny",
    targetType: result.ok ? "booking" : "slot",
    targetId: result.ok
      ? result.booking?.bookingCode ?? null
      : typeof input.slotId === "string"
        ? input.slotId
        : null,
    actorId: user?.id ?? null,
    actorRole: user?.role,
  });
}

function recordLookupAudit(request, { result }, user, ipHash) {
  recordAudit(request, {
    action: AUDIT_ACTIONS.BOOKING_LOOKUP,
    result: result.ok ? "allow" : "deny",
    targetType: "booking",
    targetId: result.ok ? result.bookings?.[0]?.bookingCode ?? null : null,
    actorId: user?.id ?? null,
    actorRole: user?.role,
  });

  if (!result.ok) {
    detectCodeEnumeration({
      ipHash,
      actorId: user?.id ?? null,
      action: AUDIT_ACTIONS.BOOKING_LOOKUP,
    });
  }
}

function createRequestChatService(request, user, ipHash) {
  const toolDependencies = createChatToolDependencies({
    onBookingResult: (entry) => recordBookingAudit(request, entry, user),
    onLookupResult: (entry) => recordLookupAudit(request, entry, user, ipHash),
  });

  return createChatService({
    generateReply: createDeepSeekGenerator(toolDependencies),
    recordChatLog,
    recordSecurityEvents,
  });
}

function recordChatAudit(request, { result, user = null }) {
  recordAudit(request, {
    action: AUDIT_ACTIONS.CHAT_MESSAGE,
    result,
    targetType: "chat_session",
    actorId: user?.id ?? null,
    actorRole: user?.role,
  });
}

async function handlePost(request) {
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
  let user = null;
  try {
    user = await getCurrentUser();
  } catch {
    // 인증 조회 실패는 비로그인 요청으로 처리하되 보안 검사는 계속한다.
  }

  const handleChat = createRequestChatService(request, user, ipHash);
  const result = await handleChat({
    sessionId: body?.sessionId,
    messages: body?.messages,
    actorId: user?.id ?? null,
    ipHash,
  });

  recordChatAudit(request, {
    result: result.ok && !result.blocked ? "allow" : "deny",
    user,
  });

  const { status, ...payload } = result;

  return Response.json(payload, { status });
}

export const POST = withApiLog(handlePost);
