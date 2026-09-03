import test from "node:test";
import assert from "node:assert/strict";

import {
  inspectAssistantOutput,
  SAFE_OUTPUT_REPLY,
} from "../../lib/security/outputGuard.js";

test("비밀키와 시스템 프롬프트 조각을 안전 응답으로 교체한다", () => {
  const secret = inspectAssistantOutput("키는 sk-ant-secret-value 입니다");
  const prompt = inspectAssistantOutput(
    "당신은 firebooking의 골프 예약 도우미입니다",
  );

  assert.equal(secret.isSafe, false);
  assert.equal(secret.reply, SAFE_OUTPUT_REPLY);
  assert.equal(prompt.isSafe, false);
  assert.equal(prompt.hits[0].ruleId, "LEAK_SECRET");
});

test("응답에 포함된 원문 PII를 마스킹한다", () => {
  const result = inspectAssistantOutput("연락처는 010-1234-5678입니다");

  assert.equal(result.isSafe, true);
  assert.equal(result.reply, "연락처는 010-****-5678입니다");
});
