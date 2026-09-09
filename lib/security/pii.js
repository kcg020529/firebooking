const INFO = "info";
const CRITICAL = "critical";

function maskName(name) {
  const characters = Array.from(name);
  const letterIndexes = characters
    .map((character, index) => (/\p{L}/u.test(character) ? index : -1))
    .filter((index) => index >= 0);

  if (letterIndexes.length <= 1) return "*";

  const first = letterIndexes[0];
  const last = letterIndexes.at(-1);
  return characters
    .map((character, index) => {
      if (!/\p{L}/u.test(character)) return character;
      if (index === first) return character;
      if (letterIndexes.length > 2 && index === last) return character;
      return "*";
    })
    .join("");
}

function maskPhone(phone) {
  const digits = phone.replace(/\D/g, "");
  const lastFour = digits.slice(-4);
  return phone.trim().startsWith("+82")
    ? `+82-**-****-${lastFour}`
    : `${digits.slice(0, 3)}-****-${lastFour}`;
}

const KOREAN_NAME = "[가-힣]{2,4}|[가-힣]\\s*[· ]\\s*[가-힣]{1,3}";
const LATIN_NAME = "[A-Z][A-Za-z'’-]+(?:\\s+[A-Z][A-Za-z'’-]+){1,3}";
const NAME_VALUE = `(?:${KOREAN_NAME}|${LATIN_NAME})`;

/** 우선순위로 겹침을 해소한다. 카드 후보는 주민번호보다 먼저 선택한다. */
export const PII_RULES = Object.freeze([
  {
    id: "PII_CARD",
    severity: CRITICAL,
    priority: 50,
    re: /(?<!\d)(?:\d{4}[-. ]?){3}\d{4}(?!\d)/g,
    mask: (match) => `****-****-****-${match.replace(/\D/g, "").slice(-4)}`,
  },
  {
    id: "PII_RRN",
    severity: CRITICAL,
    priority: 40,
    re: /(?<!\d)\d{6}[-. ]?[1-4]\d{6}(?!\d)/g,
    mask: () => "******-*******",
  },
  {
    id: "PII_PHONE",
    severity: INFO,
    priority: 30,
    re: /(?<!\d)(?:\+82[-. /]?(?:\(0\)[-. /]?)?1[016789]|\(?01[016789]\)?)[-. /]?\d{3,4}[-. /]?\d{4}(?!\d)/g,
    mask: maskPhone,
  },
  {
    id: "PII_EMAIL",
    severity: INFO,
    priority: 20,
    re: /[\w.+-]+@[\w-]+\.[\w.-]+/g,
    mask: (match) => {
      const [localPart, domain] = match.split("@");
      return `${localPart[0]}***@${domain}`;
    },
  },
  {
    id: "PII_NAME",
    severity: INFO,
    priority: 10,
    re: new RegExp(`(\"(?:name|displayName|customerName)\"\\s*:\\s*\")(${NAME_VALUE})(?=\")`, "gu"),
    group: 2,
    mask: maskName,
  },
  {
    id: "PII_NAME",
    severity: INFO,
    priority: 10,
    re: new RegExp(
      `((?:이름(?:은)?|성함(?:은)?|예약자(?:는)?|고객명(?:은)?|성명(?:은)?)\\s*[:：]?\\s*)(${NAME_VALUE})(?=\\s*(?:입니다|이고|이에요|예요|로\\s*예약|[,.;!?，。]|$))`,
      "gu",
    ),
    group: 2,
    mask: maskName,
  },
  {
    id: "PII_NAME",
    severity: INFO,
    priority: 10,
    re: new RegExp(
      `((?:저는|제가)\\s+)(${NAME_VALUE})(?=\\s*(?:입니다|이고|이에요|예요|로\\s*예약|[,.;!?，。]|$))`,
      "gu",
    ),
    group: 2,
    mask: maskName,
  },
  {
    id: "PII_NAME",
    severity: INFO,
    priority: 10,
    re: new RegExp(`(?<![\\p{L}])(${NAME_VALUE})(?=\\s*로\\s*예약)`, "gu"),
    group: 1,
    mask: maskName,
  },
  {
    id: "PII_NAME",
    severity: INFO,
    priority: 10,
    re: new RegExp(`^\\s*(${NAME_VALUE})\\s*$`, "gu"),
    group: 1,
    mask: maskName,
  },
]);

function rangesOverlap(left, right) {
  return left.start < right.end && right.start < left.end;
}

function collectMatches(text) {
  const candidates = [];

  for (const rule of PII_RULES) {
    const regex = new RegExp(rule.re.source, rule.re.flags);
    for (const match of text.matchAll(regex)) {
      const value = rule.group ? match[rule.group] : match[0];
      if (!value) continue;

      const relativeIndex = rule.group ? match[0].indexOf(value) : 0;
      const start = match.index + relativeIndex;
      candidates.push({ rule, value, start, end: start + value.length });
    }
  }

  candidates.sort((left, right) =>
    right.rule.priority - left.rule.priority ||
    left.start - right.start ||
    right.end - left.end
  );

  const selected = [];
  for (const candidate of candidates) {
    if (!selected.some((match) => rangesOverlap(match, candidate))) {
      selected.push(candidate);
    }
  }

  return selected.sort((left, right) => left.start - right.start);
}

export function detectAndMaskPii(value, { ignoredRuleIds = [] } = {}) {
  const text = typeof value === "string" ? value : "";
  const ignored = new Set(ignoredRuleIds);
  const matches = collectMatches(text).filter(({ rule }) => !ignored.has(rule.id));
  const counts = new Map();
  let cursor = 0;
  let maskedText = "";

  for (const match of matches) {
    maskedText += text.slice(cursor, match.start);
    maskedText += match.rule.mask(match.value);
    cursor = match.end;
    counts.set(match.rule.id, (counts.get(match.rule.id) ?? 0) + 1);
  }
  maskedText += text.slice(cursor);

  const hits = [];
  for (const rule of PII_RULES) {
    const count = counts.get(rule.id);
    if (!count || hits.some(({ ruleId }) => ruleId === rule.id)) continue;
    hits.push({ ruleId: rule.id, severity: rule.severity, count });
  }

  return { maskedText, hits };
}

export function hasPii(value, options) {
  return detectAndMaskPii(value, options).hits.length > 0;
}

export function createMaskedEvidence(value, maxLength = 160) {
  const safeMaxLength = Number.isInteger(maxLength) && maxLength > 0 ? maxLength : 160;
  return detectAndMaskPii(value).maskedText.slice(0, safeMaxLength);
}

/** URL 인코딩으로 마스킹을 우회하지 못하게 경로를 정규화한 뒤 제한한다. */
export function createMaskedPathEvidence(value, maxLength = 160) {
  let normalized = typeof value === 'string' ? value : '';

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const decoded = decodeURIComponent(normalized);
      if (decoded === normalized) break;
      normalized = decoded;
    } catch {
      break;
    }
  }

  normalized = normalized.replace(/[\r\n\t]/g, ' ');
  const maskedSegments = normalized
    .split('/')
    .map((segment) => detectAndMaskPii(segment).maskedText)
    .join('/');
  return createMaskedEvidence(maskedSegments, maxLength);
}
