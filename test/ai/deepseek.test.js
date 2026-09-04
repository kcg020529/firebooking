import test from "node:test";
import assert from "node:assert/strict";

import { createDeepSeekGenerator } from "../../lib/ai/deepseek.js";

const TEST_KEY = "sk-test-deepseek-key-123456789";

test("DeepSeek tool call을 서버에서 검증·실행하고 후속 응답을 받는다", async () => {
  const originalKey = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = TEST_KEY;
  const requests = [];
  const responses = [
    {
      choices: [
        {
          message: {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: "tool-1",
                type: "function",
                function: {
                  name: "search_slots",
                  arguments: JSON.stringify({ date: "2026-09-05", partySize: 3 }),
                },
              },
            ],
          },
        },
      ],
    },
    {
      choices: [
        {
          message: {
            role: "assistant",
            content: "오전 10시 예약이 가능해요.",
          },
        },
      ],
    },
  ];
  const fetchImpl = async (url, options) => {
    requests.push({ url, options, body: JSON.parse(options.body) });
    return { ok: true, json: async () => responses.shift() };
  };
  const generate = createDeepSeekGenerator(
    {
      searchSlots: async () => [
        { id: "slot-1", date: "2026-09-05", time: "10:00", price: 50000 },
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
    assert.equal(requests[0].url, "https://api.deepseek.com/chat/completions");
    assert.equal(requests[0].options.headers.authorization, `Bearer ${TEST_KEY}`);
    assert.equal(requests[0].body.model, "deepseek-v4-flash");
    assert.equal(JSON.stringify(requests[0].body).includes(TEST_KEY), false);
    assert.equal(requests[1].body.messages.at(-1).role, "tool");
    assert.equal(requests[1].body.messages.at(-1).tool_call_id, "tool-1");
  } finally {
    if (originalKey === undefined) {
      delete process.env.DEEPSEEK_API_KEY;
    } else {
      process.env.DEEPSEEK_API_KEY = originalKey;
    }
  }
});

test("DeepSeek 키가 없거나 예시 값이면 외부 요청 전에 거절한다", async () => {
  const originalKey = process.env.DEEPSEEK_API_KEY;
  delete process.env.DEEPSEEK_API_KEY;
  let requestCount = 0;
  const generate = createDeepSeekGenerator({}, async () => {
    requestCount += 1;
    return { ok: true, json: async () => ({}) };
  });

  try {
    await assert.rejects(
      () =>
        generate({
          sessionId: "session-1234",
          messages: [{ role: "user", content: "안녕" }],
        }),
      /DEEPSEEK_UNAVAILABLE/,
    );
    assert.equal(requestCount, 0);
  } finally {
    if (originalKey !== undefined) {
      process.env.DEEPSEEK_API_KEY = originalKey;
    }
  }
});

test("잘못된 DeepSeek tool 인자는 서버 검증을 통과하지 못한다", async () => {
  const originalKey = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = TEST_KEY;
  const requests = [];
  const responses = [
    {
      choices: [
        {
          message: {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: "tool-invalid",
                type: "function",
                function: { name: "create_booking", arguments: "{invalid-json" },
              },
            ],
          },
        },
      ],
    },
    {
      choices: [
        {
          message: {
            role: "assistant",
            content: "예약 정보를 다시 확인해 주세요.",
          },
        },
      ],
    },
  ];
  const generate = createDeepSeekGenerator({}, async (_url, options) => {
    requests.push(JSON.parse(options.body));
    return { ok: true, json: async () => responses.shift() };
  });

  try {
    await generate({
      sessionId: "session-1234",
      messages: [{ role: "user", content: "예약해줘" }],
    });

    const toolResult = JSON.parse(requests[1].messages.at(-1).content);
    assert.equal(toolResult.ok, false);
    assert.equal(toolResult.error, "도구 입력값이 올바르지 않아요.");
  } finally {
    if (originalKey === undefined) {
      delete process.env.DEEPSEEK_API_KEY;
    } else {
      process.env.DEEPSEEK_API_KEY = originalKey;
    }
  }
});

test("DeepSeek 요청 시 주입된 시계 기준 KST 시스템 프롬프트가 페이로드에 포함된다", async () => {
  const originalKey = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = TEST_KEY;
  const requests = [];
  const responses = [
    {
      choices: [
        {
          message: {
            role: "assistant",
            content: "9월 5일 3명 예약 가능한 슬롯을 안내해 드릴게요.",
          },
        },
      ],
    },
  ];

  const fetchImpl = async (url, options) => {
    requests.push(JSON.parse(options.body));
    return { ok: true, json: async () => responses.shift() };
  };

  const fixedClock = new Date("2026-09-04T12:00:00+09:00");
  const generate = createDeepSeekGenerator({}, fetchImpl, { clock: fixedClock });

  try {
    const result = await generate({
      sessionId: "session-1234",
      messages: [{ role: "user", content: "9월 5일에 3명 예약할 수 있는 필드 찾아줘" }],
    });

    assert.equal(result.reply, "9월 5일 3명 예약 가능한 슬롯을 안내해 드릴게요.");
    assert.equal(requests.length, 1);
    const systemMessage = requests[0].messages.find((m) => m.role === "system");
    assert.ok(systemMessage, "시스템 메시지가 존재해야 합니다");
    assert.ok(systemMessage.content.includes("오늘은 2026-09-04 (Asia/Seoul/KST)입니다."));
    assert.ok(systemMessage.content.includes("9월 5일처럼 연도가 없는 날짜는 이 기준으로 해석합니다."));
    assert.ok(systemMessage.content.includes("예약 가능 범위는 2026-09-05 ~ 2026-09-18입니다."));
    assert.ok(
      systemMessage.content.includes(
        "사용자가 날짜를 명시했으면 search_slots tool에는 반드시 YYYY-MM-DD 형식의 date를 넣으세요.",
      ),
    );
    assert.ok(
      systemMessage.content.includes(
        "범위 밖 날짜면 슬롯이 없다고 추측하지 말고, 가능한 날짜 범위를 안내하세요.",
      ),
    );
  } finally {
    if (originalKey === undefined) {
      delete process.env.DEEPSEEK_API_KEY;
    } else {
      process.env.DEEPSEEK_API_KEY = originalKey;
    }
  }
});

test("generateReply 호출 시 전달된 clock이 generator 옵션 clock보다 우선한다", async () => {
  const originalKey = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = TEST_KEY;
  const requests = [];
  const responses = [
    {
      choices: [
        {
          message: {
            role: "assistant",
            content: "확인했습니다.",
          },
        },
      ],
    },
  ];

  const fetchImpl = async (_url, options) => {
    requests.push(JSON.parse(options.body));
    return { ok: true, json: async () => responses.shift() };
  };

  const defaultClock = new Date("2026-09-01T12:00:00+09:00");
  const callClock = new Date("2026-09-04T12:00:00+09:00");
  const generate = createDeepSeekGenerator({}, fetchImpl, { clock: defaultClock });

  try {
    await generate({
      sessionId: "session-1234",
      messages: [{ role: "user", content: "예약" }],
      clock: callClock,
    });

    const systemMessage = requests[0].messages.find((m) => m.role === "system");
    assert.ok(systemMessage.content.includes("오늘은 2026-09-04 (Asia/Seoul/KST)입니다."));
  } finally {
    if (originalKey === undefined) {
      delete process.env.DEEPSEEK_API_KEY;
    } else {
      process.env.DEEPSEEK_API_KEY = originalKey;
    }
  }
});

