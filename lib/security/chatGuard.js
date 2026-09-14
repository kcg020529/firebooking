import { createHmac, timingSafeEqual } from "node:crypto";

import {
  detectPromptInjection,
  INJECTION_BLOCK_REPLY,
} from "./injection.js";

export const MAX_MESSAGE_LENGTH = 1000;
export const MAX_TURNS = 20;
// 서버가 만든 응답은 사용자 입력 상한과 따로 둔다. LLM 응답은 1000자를 넘을 수 있다.
const MAX_ASSISTANT_MESSAGE_LENGTH = 4000;

/**
 * 챗봇 응답 서명.
 *
 * 모델이 자기 이전 답변(확인 요청, 예약 완료)을 보려면 클라이언트가 assistant 메시지를
 * 다시 보내야 한다. 클라이언트가 보낸 assistant 메시지는 위조할 수 있으므로
 * 서버가 발급한 서명과 세션·내용이 모두 일치할 때만 받는다.
 * 비밀값이 없으면 서명하지 않는다 — 이력 없이 사용자 메시지만으로 동작한다.
 */
export function signAssistantReply(sessionId, content, env = process.env) {
  const secret = env.IP_HASH_SALT?.trim();

  if (!secret || typeof sessionId !== "string" || typeof content !== "string") {
    return null;
  }

  return createHmac("sha256", secret)
    .update(`chat-reply:${sessionId}:${content}`)
    .digest("base64url");
}

export function isAssistantReplySigned(sessionId, content, signature, env = process.env) {
  const expected = signAssistantReply(sessionId, content, env);

  if (!expected || typeof signature !== "string") {
    return false;
  }

  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export function validateChatMessages(messages, { sessionId = null, env = process.env } = {}) {
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
    const isUser = message?.role === "user";
    const isSignedAssistant =
      message?.role === "assistant" &&
      isAssistantReplySigned(sessionId, message.content, message.signature, env);

    if (
      !message ||
      typeof message !== "object" ||
      typeof message.content !== "string" ||
      (!isUser && !isSignedAssistant)
    ) {
      return {
        ok: false,
        error: "대화 기록이 올바르지 않아요. 새로고침 후 다시 시도해 주세요.",
      };
    }

    if (message.content.trim().length === 0) {
      return { ok: false, error: "빈 메시지는 보낼 수 없어요." };
    }

    const maxLength = isUser ? MAX_MESSAGE_LENGTH : MAX_ASSISTANT_MESSAGE_LENGTH;
    if (message.content.length > maxLength) {
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

export function inspectChatMessages(messages, options) {
  const validation = validateChatMessages(messages, options);

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

  // 이력에 남은(또는 위조된) 공격 문장은 LLM 에 넘기지 않는다. 서명은 서버 검증용이라 뺀다.
  const safeMessages = messages
    .filter(({ content }) => !detectPromptInjection(content).isBlocked)
    .map(({ role, content }) => ({ role, content }));

  return { ok: true, messages: safeMessages };
}
