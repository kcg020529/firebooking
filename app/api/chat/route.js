import { createChatService } from "../../../lib/ai/chatService.js";
import { createClaudeGenerator } from "../../../lib/ai/claude.js";
import {
  recordChatLog,
  recordSecurityEvents,
} from "../../../lib/security/chatLog.js";

const handleChat = createChatService({
  generateReply: createClaudeGenerator(),
  recordChatLog,
  recordSecurityEvents,
});

export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "요청 본문이 올바른 JSON이 아니에요." },
      { status: 400 },
    );
  }

  const result = await handleChat({
    sessionId: body?.sessionId,
    messages: body?.messages,
  });
  const { status, ...payload } = result;

  return Response.json(payload, { status });
}
