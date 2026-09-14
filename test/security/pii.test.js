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
  assert.ok(result.hits.some((h) => h.ruleId === "PII_RRN" && h.severity === "warn"));
  assert.ok(result.hits.some((h) => h.ruleId === "PII_CARD" && h.severity === "warn"));
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
    { ruleId: "PII_CARD", severity: "warn", count: 1 },
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

test("챗봇 예약 확인 응답의 예약자 이름을 마스킹하고 일반 문구는 두지 않는다", () => {
  const reply = "4명 예약 가능합니다. 아래 정보로 예약 진행할까요?\n\n- 예약자: 이동훈\n- 전화번호: 010-1234-5678";

  assert.equal(
    detectAndMaskPii(reply).maskedText,
    "4명 예약 가능합니다. 아래 정보로 예약 진행할까요?\n\n- 예약자: 이*훈\n- 전화번호: 010-****-5678",
  );
});

test("이름 뒤 줄바꿈·공백·괄호·호칭이 와도 이름만 마스킹한다", () => {
  const cases = [
    ["이름: 이동훈\n전화: 01012345678", "이름: 이*훈\n전화: 010-****-5678"],
    ["이름은 이동훈 전화번호는 010-1234-5678 입니다", "이름은 이*훈 전화번호는 010-****-5678 입니다"],
    ["예약자: 이동훈 (010-****-5678)", "예약자: 이*훈 (010-****-5678)"],
    ["예약자명: 이동훈", "예약자명: 이*훈"],
    ["예약자 이동훈 님", "예약자 이*훈 님"],
    ["이동훈으로 예약해줘", "이*훈으로 예약해줘"],
    ["홍길동으로 예약", "홍*동으로 예약"],
    ["이동훈님 예약이 완료되었습니다", "이*훈님 예약이 완료되었습니다"],
    ["이동훈 고객님, 확인해 주세요", "이*훈 고객님, 확인해 주세요"],
  ];

  for (const [text, expected] of cases) {
    assert.equal(detectAndMaskPii(text).maskedText, expected, text);
  }
});

test("로 예약·님 앞의 일반 명사는 이름으로 오탐하지 않는다", () => {
  const cases = [
    "이 정보로 예약할게요",
    "그 시간으로 예약",
    "스크린으로 예약해줘",
    "필드로 예약",
    "오전으로 예약해줘",
    "이번주로 예약해줘",
    "그린힐로 예약",
    "이용자님 안내드립니다",
    "이름 확인 후 알려드릴게요",
    "예약자 성함과 전화번호를 알려주세요.",
    "이름과 전화번호를 알려주시면 예약해 드릴게요.",
    "이름은 필수입니다",
    "예약자는 본인이어야 합니다",
  ];

  for (const text of cases) {
    assert.equal(detectAndMaskPii(text).maskedText, text, text);
  }
});

test("라벨 없이 전화번호와 함께 보낸 이름을 마스킹한다", () => {
  const cases = [
    ["이동훈 010-1234-5678", "이*훈 010-****-5678"],
    ["이동훈, 010-1234-5678", "이*훈, 010-****-5678"],
    ["010-1234-5678 이동훈", "010-****-5678 이*훈"],
    ["010-1234-5678 이동훈입니다", "010-****-5678 이*훈입니다"],
    ["연락처 010-1234-5678", "연락처 010-****-5678"],
    ["- 전화번호: 010-****-5678\n\n이대로 예약 진행할까요?", "- 전화번호: 010-****-5678\n\n이대로 예약 진행할까요?"],
  ];

  for (const [text, expected] of cases) {
    assert.equal(detectAndMaskPii(text).maskedText, expected, text);
  }
});

test("챗봇에 보내는 짧은 대답은 단독 이름으로 오탐하지 않는다", () => {
  const cases = ["좋아요", "네 맞아요", "예약해줘", "확인", "그걸로요", "그린힐", "스크린", "이거요", "고마워"];

  for (const text of cases) {
    assert.equal(hasPii(text), false, text);
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
