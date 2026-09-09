import test from "node:test";
import assert from "node:assert/strict";

import {
  createMaskedEvidence,
  createMaskedPathEvidence,
  detectAndMaskPii,
  hasPii,
} from "../../lib/security/pii.js";

test("전화번호를 정규화된 마스킹 형태로 바꾼다", () => {
  const result = detectAndMaskPii("연락처는 010.1234.5678입니다");

  assert.equal(result.maskedText, "연락처는 010-****-5678입니다");
  assert.deepEqual(result.hits, [
    { ruleId: "PII_PHONE", severity: "info", count: 1 },
  ]);
});

test("주민번호와 카드번호 원문을 모두 제거한다", () => {
  const result = detectAndMaskPii(
    "주민번호 900101-1234567, 카드 1234 5678 9012 3456",
  );

  assert.equal(
    result.maskedText,
    "주민번호 ******-*******, 카드 ****-****-****-3456",
  );
  assert.equal(result.maskedText.includes("900101"), false);
  assert.equal(result.maskedText.includes("1234 5678"), false);
});

test("이메일과 문맥으로 확인된 이름을 마스킹한다", () => {
  const result = detectAndMaskPii(
    "저는 홍길동이고 이메일은 booking.user@example.com 입니다",
  );

  assert.equal(
    result.maskedText,
    "저는 홍*동이고 이메일은 b***@example.com 입니다",
  );
  assert.deepEqual(
    result.hits.map(({ ruleId }) => ruleId),
    ["PII_EMAIL", "PII_NAME"],
  );
});

test("두 글자 이름도 최소 한 글자를 가린다", () => {
  const result = detectAndMaskPii("이름은 김민");

  assert.equal(result.maskedText, "이름은 김*");
});

test("이름 뒤에 문장부호가 와도 이름을 마스킹한다", () => {
  const result = detectAndMaskPii("이름은 김민, 전화는 010-1234-5678");

  assert.equal(result.maskedText, "이름은 김*, 전화는 010-****-5678");
  assert.deepEqual(
    result.hits.map(({ ruleId }) => ruleId),
    ["PII_PHONE", "PII_NAME"],
  );
});

test("저는 다음의 이름은 문장부호가 있을 때만 독립 이름으로 처리한다", () => {
  assert.equal(detectAndMaskPii("저는 홍길동, 예약할게요").maskedText, "저는 홍*동, 예약할게요");
  assert.equal(detectAndMaskPii("저는 골프장 예약을 하고 싶어요").maskedText, "저는 골프장 예약을 하고 싶어요");
});

test("문맥 없는 일반 골프 문장은 이름으로 오탐하지 않는다", () => {
  const cases = ["스크린골프 예약할게요", "저는 골프장 예약을 하고 싶어요"];

  for (const text of cases) {
    const result = detectAndMaskPii(text);
    assert.equal(result.maskedText, text);
    assert.equal(hasPii(text), false);
  }
});

test("증거 문자열은 전체 마스킹 후 길이를 제한한다", () => {
  const evidence = createMaskedEvidence(
    `${"가".repeat(150)} 010-1234-5678 뒤쪽 문장`,
    180,
  );

  assert.equal(evidence.includes("010-1234-5678"), false);
  assert.equal(evidence.includes("010-****-5678"), true);
  assert.ok(evidence.length <= 180);
});

test("문자열이 아닌 입력은 빈 결과로 처리한다", () => {
  assert.deepEqual(detectAndMaskPii(null), { maskedText: "", hits: [] });
});

test("국제 표기와 괄호·슬래시 전화번호를 탐지한다", () => {
  const cases = [
    "+82 10 1234 5678",
    "+82-10-1234-5678",
    "+82 (0)10 1234 5678",
    "(010) 1234-5678",
    "010/1234/5678",
  ];

  for (const phone of cases) {
    const result = detectAndMaskPii(phone);
    assert.equal(result.hits[0]?.ruleId, "PII_PHONE", phone);
    assert.equal(result.maskedText.includes("1234"), false, phone);
  }
});

test("더 긴 숫자와 날짜형 식별자를 전화번호로 부분 탐지하지 않는다", () => {
  const cases = ["010123456789", "2010-1234-5678", "주문번호 9901015123456"];

  for (const text of cases) {
    const result = detectAndMaskPii(text);
    assert.equal(result.hits.some(({ ruleId }) => ruleId === "PII_PHONE"), false, text);
  }
});

test("16자리 카드번호는 주민번호가 아니라 카드로 한 번만 분류한다", () => {
  const result = detectAndMaskPii("4111111111111111");

  assert.equal(result.maskedText, "****-****-****-1111");
  assert.deepEqual(result.hits, [
    { ruleId: "PII_CARD", severity: "critical", count: 1 },
  ]);
});

test("문맥 없는 단독 이름과 예약 문맥의 다양한 이름을 탐지한다", () => {
  const cases = [
    "김철수",
    "김철수로 예약해 주세요",
    "예약자는 김철수입니다",
    "성명: 김·민수",
    "고객명은 John Kim입니다",
  ];

  for (const text of cases) {
    const result = detectAndMaskPii(text);
    assert.equal(result.hits.some(({ ruleId }) => ruleId === "PII_NAME"), true, text);
    assert.equal(result.maskedText.includes("김철수"), false, text);
    assert.equal(result.maskedText.includes("John Kim"), false, text);
  }
});

test("URL 인코딩된 경로 개인정보와 로그 제어문자를 정규화한다", () => {
  const evidence = createMaskedPathEvidence(
    "/admin/%EA%B9%80%EC%B2%A0%EC%88%98/010%201234%205678%0Aforged",
  );

  assert.equal(evidence.includes("김철수"), false);
  assert.equal(evidence.includes("010 1234 5678"), false);
  assert.equal(evidence.includes("\n"), false);
});
