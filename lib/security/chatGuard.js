import {
  detectPromptInjection,
  INJECTION_BLOCK_REPLY,
} from "./injection.js";

export const MAX_MESSAGE_LENGTH = 1000;
export const MAX_TURNS = 20;

const ALLOWED_ROLES = new Set(["user"]);

export function validateChatMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, error: "대화 내용을 입력해 주세요." };
  }

  if (messages.length > MAX_TURNS) {
    return {
      ok: false,
      error: `대화는 최대 ${MAX_TURNS}턴까지 이어갈 수 있어요.`,
    };
  }

  for (const message of messages) {
    if (
      !message ||
      typeof message !== "object" ||
      !ALLOWED_ROLES.has(message.role) ||
      typeof message.content !== "string"
    ) {
      return {
        ok: false,
        error: "클라이언트는 사용자 메시지만 보낼 수 있어요.",
      };
    }

    if (message.content.trim().length === 0) {
      return { ok: false, error: "빈 메시지는 보낼 수 없어요." };
    }

    if (message.content.length > MAX_MESSAGE_LENGTH) {
      return {
        ok: false,
        error: `메시지는 ${MAX_MESSAGE_LENGTH}자 이내로 입력해 주세요.`,
      };
    }
  }

  if (messages.at(-1).role !== "user") {
    return { ok: false, error: "마지막 메시지는 사용자 메시지여야 해요." };
  }

  return { ok: true };
}

export function inspectChatMessages(messages) {
  const validation = validateChatMessages(messages);

  if (!validation.ok) {
    return validation;
  }

  const combinedContent = messages.map(({ content }) => content).join("\n");
  const detection = detectPromptInjection(combinedContent);

  if (detection.isBlocked) {
    return {
      ok: false,
      isInjection: true,
      reply: INJECTION_BLOCK_REPLY,
      severity: detection.severity,
      hits: detection.hits,
    };
  }

  return { ok: true };
}
