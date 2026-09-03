import { createChatService } from "../../../lib/ai/chatService.js";
import { createClaudeGenerator } from "../../../lib/ai/claude.js";
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

function recordBookingAudit(request, { input, result }) {
  recordAudit(request, {
    action: AUDIT_ACTIONS.BOOKING_CREATE,
    result: result.ok ? "allow" : "deny",
    targetType: result.ok ? "booking" : "slot",
    targetId: result.ok
      ? result.booking?.bookingCode ?? null
      : typeof input.slotId === "string"
        ? input.slotId
        : null,
  });
}

function createRequestChatService(request) {
  const toolDependencies = createChatToolDependencies({
    onBookingResult: (entry) => recordBookingAudit(request, entry),
  });

  return createChatService({
    generateReply: createClaudeGenerator(toolDependencies),
    recordChatLog,
    recordSecurityEvents,
  });
}

function recordChatAudit(request, { result }) {
  recordAudit(request, {
    action: AUDIT_ACTIONS.CHAT_MESSAGE,
    result,
    targetType: "chat_session",
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
  const handleChat = createRequestChatService(request);
  const result = await handleChat({
    sessionId: body?.sessionId,
    messages: body?.messages,
    ipHash: clientIp ? hashIp(clientIp) : null,
  });

  recordChatAudit(request, {
    result: result.ok && !result.blocked ? "allow" : "deny",
  });

  const { status, ...payload } = result;

  return Response.json(payload, { status });
}

export const POST = withApiLog(handlePost);
