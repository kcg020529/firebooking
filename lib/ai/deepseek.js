import { CHAT_SYSTEM_PROMPT } from "./prompt.js";
import { CHAT_TOOLS, executeToolCall } from "./tools.js";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const MODEL = "deepseek-v4-flash";
const MAX_TOOL_ROUNDS = 4;
const REQUEST_TIMEOUT_MS = 20_000;

const DEEPSEEK_TOOLS = CHAT_TOOLS.map(
  ({ name, description, input_schema: parameters }) => ({
    type: "function",
    function: { name, description, parameters },
  }),
);

function getApiKey() {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();

  // 키 형식은 공급자가 바꿀 수 있으므로 prefix를 신뢰하지 않는다.
  // 빈 값·예시 값·지나치게 짧은 값만 로컬에서 거절하고 실제 유효성은 공급자가 판정한다.
  if (
    !apiKey ||
    apiKey.length < 16 ||
    apiKey.includes("<") ||
    /\s/.test(apiKey)
  ) {
    throw new Error("DEEPSEEK_UNAVAILABLE");
  }

  return apiKey;
}

function parseToolInput(value) {
  if (typeof value !== "string") return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function requestDeepSeek(messages, fetchImpl) {
  const apiKey = getApiKey();
  const response = await fetchImpl(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools: DEEPSEEK_TOOLS,
      tool_choice: "auto",
      thinking: { type: "disabled" },
      max_tokens: 700,
      stream: false,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  // 공급자 응답 본문은 키·내부 정보가 섞일 수 있어 오류에 포함하거나 로그로 남기지 않는다.
  if (!response.ok) {
    throw new Error("DEEPSEEK_REQUEST_FAILED");
  }

  const data = await response.json();
  const message = data?.choices?.[0]?.message;

  if (!message || message.role !== "assistant") {
    throw new Error("DEEPSEEK_RESPONSE_INVALID");
  }

  return message;
}

export function createDeepSeekGenerator(
  toolDependencies = {},
  fetchImpl = fetch,
) {
  return async function generateReply({ sessionId, messages, actorId = null }) {
    const conversation = [
      { role: "system", content: CHAT_SYSTEM_PROMPT },
      ...messages.map(({ role, content }) => ({ role, content })),
    ];
    let bookingCode;

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
      const message = await requestDeepSeek(conversation, fetchImpl);
      const toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
      const text = typeof message.content === "string" ? message.content.trim() : "";

      if (toolCalls.length === 0) {
        if (!text) {
          throw new Error("DEEPSEEK_RESPONSE_EMPTY");
        }

        return {
          reply: text,
          ...(bookingCode ? { bookingCode } : {}),
        };
      }

      if (round === MAX_TOOL_ROUNDS) {
        throw new Error("DEEPSEEK_TOOL_LIMIT");
      }

      const assistantToolCalls = [];
      const toolResults = [];

      for (const toolCall of toolCalls) {
        const name = toolCall?.function?.name;
        const argumentsText = toolCall?.function?.arguments;
        const id = typeof toolCall?.id === "string" ? toolCall.id : "invalid-tool-call";

        assistantToolCalls.push({
          id,
          type: "function",
          function: {
            name: typeof name === "string" ? name : "invalid_tool",
            arguments: typeof argumentsText === "string" ? argumentsText : "{}",
          },
        });

        const result = await executeToolCall(
          { name, input: parseToolInput(argumentsText) },
          toolDependencies,
          { sessionId, actorId },
        );

        if (result.bookingCode) {
          bookingCode = result.bookingCode;
        }

        toolResults.push({
          role: "tool",
          tool_call_id: id,
          content: JSON.stringify(result),
        });
      }

      conversation.push({
        role: "assistant",
        content: text || null,
        tool_calls: assistantToolCalls,
      });
      conversation.push(...toolResults);
    }

    throw new Error("DEEPSEEK_TOOL_LIMIT");
  };
}
