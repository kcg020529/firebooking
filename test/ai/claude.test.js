import test from "node:test";
import assert from "node:assert/strict";

import { createClaudeGenerator } from "../../lib/ai/claude.js";

test("Claude tool_use 결과를 서버에서 실행하고 후속 응답을 받는다", async () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = "test-key";
  const requests = [];
  const responses = [
    {
      content: [
        {
          type: "tool_use",
          id: "tool-1",
          name: "search_slots",
          input: { date: "2026-09-03", partySize: 3 },
        },
      ],
    },
    { content: [{ type: "text", text: "오전 10시 예약이 가능해요." }] },
  ];
  const fetchImpl = async (url, options) => {
    requests.push({ url, body: JSON.parse(options.body) });
    return { ok: true, json: async () => responses.shift() };
  };
  const generate = createClaudeGenerator(
    {
      searchSlots: async () => [
        { id: "slot-1", date: "2026-09-03", time: "10:00", price: 50000 },
      ],
    },
    fetchImpl,
  );

  try {
    const result = await generate({
      sessionId: "session-1234",
      messages: [{ role: "user", content: "내일 3명 자리 찾아줘" }],
    });

    assert.equal(result.reply, "오전 10시 예약이 가능해요.");
    assert.equal(requests.length, 2);
    assert.equal(requests[1].body.messages.at(-1).content[0].type, "tool_result");
  } finally {
    if (originalKey === undefined) {
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = originalKey;
    }
  }
});
