import { CHAT_SYSTEM_PROMPT } from "./prompt.js";
import { CHAT_TOOLS, executeToolCall } from "./tools.js";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOOL_ROUNDS = 4;

async function requestClaude(messages, fetchImpl) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("CLAUDE_UNAVAILABLE");
  }

  const response = await fetchImpl(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 700,
      system: CHAT_SYSTEM_PROMPT,
      tools: CHAT_TOOLS,
      messages,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("CLAUDE_REQUEST_FAILED");
  }

  const data = await response.json();

  if (!Array.isArray(data.content)) {
    throw new Error("CLAUDE_RESPONSE_INVALID");
  }

  return data;
}

export function createClaudeGenerator(
  toolDependencies = {},
  fetchImpl = fetch,
) {
  return async function generateReply({ sessionId, messages, actorId = null }) {
    const conversation = messages.map(({ role, content }) => ({ role, content }));
    let bookingCode;

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
      const response = await requestClaude(conversation, fetchImpl);
      const toolCalls = response.content.filter(({ type }) => type === "tool_use");
      const text = response.content
        .filter(
          (block) => block.type === "text" && typeof block.text === "string",
        )
        .map((block) => block.text)
        .join("\n")
        .trim();

      if (toolCalls.length === 0) {
        if (!text) {
          throw new Error("CLAUDE_RESPONSE_EMPTY");
        }

        return {
          reply: text,
          ...(bookingCode ? { bookingCode } : {}),
        };
      }

      if (round === MAX_TOOL_ROUNDS) {
        throw new Error("CLAUDE_TOOL_LIMIT");
      }

      const toolResults = [];

      for (const toolCall of toolCalls) {
        const result = await executeToolCall(
          { name: toolCall.name, input: toolCall.input },
          toolDependencies,
          { sessionId, actorId },
        );

        if (result.bookingCode) {
          bookingCode = result.bookingCode;
        }

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolCall.id,
          content: JSON.stringify(result),
          is_error: !result.ok,
        });
      }

      conversation.push({ role: "assistant", content: response.content });
      conversation.push({ role: "user", content: toolResults });
    }

    throw new Error("CLAUDE_TOOL_LIMIT");
  };
}
