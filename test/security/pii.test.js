import test from "node:test";
import assert from "node:assert/strict";

import {
  createMaskedEvidence,
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
