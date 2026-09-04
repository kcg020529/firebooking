import { PROTECTED_PROMPT_MARKERS } from "../ai/prompt.js";
import { detectAndMaskPii } from "./pii.js";
import { scanForSecrets } from "./leak.js";

export const SAFE_OUTPUT_REPLY =
  "응답을 안전하게 처리하지 못했어요. 예약 정보를 다시 확인해 주세요.";

export function inspectAssistantOutput(value) {
  const text = typeof value === "string" ? value : "";
  const hasSecret = scanForSecrets(text).length > 0;
  const hasPromptMarker = PROTECTED_PROMPT_MARKERS.some((marker) =>
    text.includes(marker),
  );

  if (hasSecret || hasPromptMarker) {
    return {
      isSafe: false,
      reply: SAFE_OUTPUT_REPLY,
      hits: [
        {
          ruleId: "LEAK_SECRET",
          severity: "critical",
          count: 1,
        },
      ],
    };
  }

  const piiResult = detectAndMaskPii(text);

  return {
    isSafe: true,
    reply: piiResult.maskedText,
    hits: piiResult.hits,
  };
}
