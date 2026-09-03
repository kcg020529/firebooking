import { inspectChatMessages } from "../security/chatGuard.js";
import { detectAndMaskPii } from "../security/pii.js";
import { inspectAssistantOutput } from "../security/outputGuard.js";

const SESSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_QUICK_REPLIES = Object.freeze([
  "필드 골프장 찾아줘",
  "스크린 골프장 찾아줘",
  "예약 가능한 시간 볼게요",
]);

async function safelyRecord(operation) {
  try {
    await operation();
  } catch {
    console.error("보안 로그를 기록하지 못했습니다.");
  }
}

function countHits(hits) {
  return hits.reduce((total, hit) => total + hit.count, 0);
}

function sanitizeQuickReplies(values) {
  if (!Array.isArray(values)) {
    return DEFAULT_QUICK_REPLIES;
  }

  const safeReplies = values
    .filter((value) => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && value.length <= 50)
    .filter((value) => {
      const inspection = inspectAssistantOutput(value);
      return inspection.isSafe && inspection.hits.length === 0;
    })
    .slice(0, 4);

  return safeReplies.length > 0 ? safeReplies : DEFAULT_QUICK_REPLIES;
}

export function createChatService({
  generateReply,
  recordChatLog,
  recordSecurityEvents,
}) {
  if (
    typeof generateReply !== "function" ||
    typeof recordChatLog !== "function" ||
    typeof recordSecurityEvents !== "function"
  ) {
    throw new TypeError("챗봇 서버 의존성이 올바르지 않습니다.");
  }

  return async function handleChat({ sessionId, messages, actorId = null, ipHash = null }) {
    if (typeof sessionId !== "string" || !SESSION_ID_RE.test(sessionId)) {
      return { ok: false, error: "올바르지 않은 세션이에요.", status: 400 };
    }

    const inspection = inspectChatMessages(messages);

    if (!inspection.ok && !inspection.isInjection) {
      return { ...inspection, status: 400 };
    }

    const latestMessage = messages.at(-1);
    const piiResult = detectAndMaskPii(latestMessage.content);

    await safelyRecord(() =>
      recordChatLog({
        sessionId,
        role: "user",
        content: piiResult.maskedText,
        piiHits: countHits(piiResult.hits),
      }),
    );

    if (piiResult.hits.length > 0) {
      await safelyRecord(() =>
        recordSecurityEvents({
          hits: piiResult.hits,
          category: "pii",
          evidence: piiResult.maskedText,
          actorId,
          ipHash,
        }),
      );
    }

    if (inspection.isInjection) {
      await safelyRecord(() =>
        recordSecurityEvents({
          hits: inspection.hits,
          category: "injection",
          evidence: piiResult.maskedText,
          actorId,
          ipHash,
        }),
      );

      return {
        ok: true,
        reply: inspection.reply,
        quickReplies: DEFAULT_QUICK_REPLIES,
        blocked: true,
        status: 200,
      };
    }

    let generated;

    try {
      generated = await generateReply({ sessionId, messages, actorId });
    } catch {
      return {
        ok: false,
        error: "챗봇 응답을 만들지 못했어요. 잠시 후 다시 시도해 주세요.",
        status: 502,
      };
    }

    const output = inspectAssistantOutput(generated.reply);
    const leakHits = output.hits.filter(({ ruleId }) => ruleId === "LEAK_SECRET");
    const outputPiiHits = output.hits.filter(({ ruleId }) =>
      ruleId.startsWith("PII_"),
    );

    if (leakHits.length > 0) {
      await safelyRecord(() =>
        recordSecurityEvents({
          hits: leakHits,
          category: "leak",
          evidence: output.reply,
          actorId,
          ipHash,
        }),
      );
    }

    if (outputPiiHits.length > 0) {
      await safelyRecord(() =>
        recordSecurityEvents({
          hits: outputPiiHits,
          category: "pii",
          evidence: output.reply,
          actorId,
          ipHash,
        }),
      );
    }

    await safelyRecord(() =>
      recordChatLog({
        sessionId,
        role: "assistant",
        content: output.reply,
        piiHits: countHits(output.hits),
      }),
    );

    return {
      ok: true,
      reply: output.reply,
      quickReplies: sanitizeQuickReplies(generated.quickReplies),
      ...(generated.bookingCode ? { bookingCode: generated.bookingCode } : {}),
      status: 200,
    };
  };
}
