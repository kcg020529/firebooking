import test from "node:test";
import assert from "node:assert/strict";

import {
  getDateContext,
  addDaysToYmd,
  KST_TIMEZONE,
} from "../../lib/ai/dateContext.js";
import {
  buildChatSystemPrompt,
  CHAT_SYSTEM_PROMPT,
} from "../../lib/ai/prompt.js";

test("Asia/Seoul(KST) 기준 오늘과 14일 예약 가능 범위를 계산한다", () => {
  const fixedClock = new Date("2026-09-04T12:00:00+09:00");
  const context = getDateContext(fixedClock);

  assert.equal(context.today, "2026-09-04");
  assert.equal(context.windowStart, "2026-09-05");
  assert.equal(context.windowEnd, "2026-09-18");
});

test("주입 가능한 시계(함수, 문자열, 타임스탬프)를 올바르게 처리한다", () => {
  const fnResult = getDateContext(() => new Date("2026-09-04T00:00:00Z"));
  assert.equal(fnResult.today, "2026-09-04");

  const strResult = getDateContext("2026-09-04T03:00:00Z");
  assert.equal(strResult.today, "2026-09-04");

  const tsResult = getDateContext(new Date("2026-09-04T03:00:00Z").getTime());
  assert.equal(tsResult.today, "2026-09-04");
});

test("KST 자정 경계에서 날짜가 정확히 전환된다", () => {
  // UTC 14:59:59는 KST 23:59:59 (당일)
  const beforeMidnight = getDateContext("2026-09-04T14:59:59.000Z");
  assert.equal(beforeMidnight.today, "2026-09-04");
  assert.equal(beforeMidnight.windowStart, "2026-09-05");
  assert.equal(beforeMidnight.windowEnd, "2026-09-18");

  // UTC 15:00:00은 KST 00:00:00 (익일)
  const afterMidnight = getDateContext("2026-09-04T15:00:00.000Z");
  assert.equal(afterMidnight.today, "2026-09-05");
  assert.equal(afterMidnight.windowStart, "2026-09-06");
  assert.equal(afterMidnight.windowEnd, "2026-09-19");
});

test("월말 및 연말 경계에서 예약 가능 기간이 올바르게 계산된다", () => {
  const yearEnd = getDateContext(new Date("2026-12-25T12:00:00+09:00"));
  assert.equal(yearEnd.today, "2026-12-25");
  assert.equal(yearEnd.windowStart, "2026-12-26");
  assert.equal(yearEnd.windowEnd, "2027-01-08");

  assert.equal(addDaysToYmd("2026-02-28", 1), "2026-03-01");
});

test("기본 시계(미제공 시)는 오늘 날짜 문자열(YYYY-MM-DD)을 반환한다", () => {
  const context = getDateContext();
  assert.match(context.today, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(context.windowStart, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(context.windowEnd, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(KST_TIMEZONE, "Asia/Seoul");
});

test("buildChatSystemPrompt는 기본 지시사항과 명시적 KST 날짜 규칙을 포함한다", () => {
  const fixedClock = new Date("2026-09-04T12:00:00+09:00");
  const prompt = buildChatSystemPrompt(fixedClock);

  assert.ok(prompt.startsWith(CHAT_SYSTEM_PROMPT));
  assert.ok(prompt.includes("오늘은 2026-09-04 (Asia/Seoul/KST)입니다."));
  assert.ok(
    prompt.includes("9월 5일처럼 연도가 없는 날짜는 이 기준으로 해석합니다."),
  );
  assert.ok(prompt.includes("예약 가능 범위는 2026-09-05 ~ 2026-09-18입니다."));
  assert.ok(
    prompt.includes(
      "사용자가 날짜를 명시했으면 search_slots tool에는 반드시 YYYY-MM-DD 형식의 date를 넣으세요.",
    ),
  );
  assert.ok(
    prompt.includes(
      "범위 밖 날짜면 슬롯이 없다고 추측하지 말고, 가능한 날짜 범위를 안내하세요.",
    ),
  );
});

test("buildChatSystemPrompt에 사전 계산된 dateContext 객체를 전달할 수 있다", () => {
  const customContext = {
    today: "2026-09-04",
    windowStart: "2026-09-05",
    windowEnd: "2026-09-18",
  };
  const prompt = buildChatSystemPrompt(customContext);

  assert.ok(prompt.includes("오늘은 2026-09-04 (Asia/Seoul/KST)입니다."));
  assert.ok(prompt.includes("예약 가능 범위는 2026-09-05 ~ 2026-09-18입니다."));
});
