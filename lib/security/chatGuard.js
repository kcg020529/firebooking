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

  // 차단 여부는 이번에 보낸 마지막 메시지로 판단한다. 이전 턴의 공격은 그 턴에 이미
  // 차단·기록됐으므로 다시 막으면 이후 정상 질문까지 세션 내내 거절된다.
  const detection = detectPromptInjection(messages.at(-1).content);

  if (detection.isBlocked) {
    return {
      ok: false,
      isInjection: true,
      reply: INJECTION_BLOCK_REPLY,
      severity: detection.severity,
      hits: detection.hits,
    };
  }

  // 이력에 남은(또는 위조된) 공격 문장은 LLM 에 넘기지 않는다.
  const safeMessages = messages.filter(
    ({ content }) => !detectPromptInjection(content).isBlocked,
  );

  return { ok: true, messages: safeMessages };
}
