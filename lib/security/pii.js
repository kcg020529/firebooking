const INFO = "info";
const WARN = "warn";
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

// 이름 뒤 조사("으로", "이고")를 이름에 포함하지 않도록 짧은 쪽부터 매칭한다.
const KOREAN_NAME = "[가-힣]{2,4}?|[가-힣]\\s*[· ]\\s*[가-힣]{1,3}";
const LATIN_NAME = "[A-Z][A-Za-z'’-]+(?:\\s+[A-Z][A-Za-z'’-]+){1,3}";
const NAME_VALUE = `(?:${KOREAN_NAME}|${LATIN_NAME})`;

// 라벨이 없는 문맥("○○로 예약", "○○님")은 흔한 성씨로 시작하는 세 글자만 이름으로 본다.
// "정보로 예약", "필드로 예약" 같은 일반 명사 오탐을 막기 위한 제한이다.
const SURNAMES = "김이박최정강조윤장임한오서신권황안송류유홍전고문양손배백허남심노하곽성차주우구민진나지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모탁국어은편용예경봉";
const NAME_STOPWORDS = "이용|이번|이날|이틀|이곳|이쪽|이거|이걸|이게|이건|오전|오후|오늘|오케|한시|한번|전체|전화|전부|정보|주말|조식|안내|안녕|안돼|안되|신규|기존|고객|고마|문의|문자|연락|최대|최소|예약|하나|나중|진행|변경";
const CONTEXTLESS_NAME = `(?:(?!${NAME_STOPWORDS})[${SURNAMES}][가-힣]{2}|${LATIN_NAME})`;
const PHONE_NEAR_NAME = "(?:\\+82[-. ]?|0)1[016789][-. /]?[\\d*]{3,4}[-. /]?\\d{4}";

// 라벨은 콜론·조사·공백으로 값과 분리돼야 한다("이름과 전화번호"는 라벨이 아니다).
const NAME_LABEL = "(?:이름|성함|예약자명|예약자|고객명|성명)(?:(?:은|는)?\\s*[:：]\\s*|(?:은|는)\\s*|\\s+)";
// 라벨 뒤에 흔히 오는 일반 명사("예약자 성함과", "이름은 필수입니다")는 이름이 아니다.
const LABEL_STOPWORDS = "이름|성함|성명|전화|연락|번호|필수|본인|확인|정보|입력|변경|누구";

// 라벨 뒤 이름의 끝: 줄 끝·공백 뒤 연락처·문장부호·괄호·숫자·호칭·서술어.
const LABELED_NAME_END = "(?=\\s*(?:$|[\\r\\n]|[,.;!?，。()\\[\\]/|]|\\d|님|씨|고객님|입니다|이고|이에요|예요|이며|(?:으)?로|전화|연락처|휴대폰|번호))";

/** 우선순위로 겹침을 해소한다. 카드 후보는 주민번호보다 먼저 선택한다. */
export const PII_RULES = Object.freeze([
  {
    id: "PII_CARD",
    severity: WARN,
    priority: 50,
    re: /(?<!\d)(?:\d{4}[-. ]?){3}\d{4}(?!\d)/g,
    mask: (match) => `****-****-****-${match.replace(/\D/g, "").slice(-4)}`,
  },
  {
    id: "PII_RRN",
    severity: WARN,
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
      `(${NAME_LABEL})(?!${LABEL_STOPWORDS})(${NAME_VALUE})${LABELED_NAME_END}`,
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
      `((?:저는|제가)\\s+)(${NAME_VALUE})(?=\\s*(?:입니다|이고|이에요|예요|(?:으)?로\\s*예약|[,.;!?，。]|$))`,
      "gu",
    ),
    group: 2,
    mask: maskName,
  },
  {
    id: "PII_NAME",
    severity: INFO,
    priority: 10,
    re: new RegExp(`(?<![\\p{L}])(${CONTEXTLESS_NAME})(?=\\s*(?:으)?로\\s*예약)`, "gu"),
    group: 1,
    mask: maskName,
  },
  {
    id: "PII_NAME",
    severity: INFO,
    priority: 10,
    re: new RegExp(`(?<![\\p{L}])(${CONTEXTLESS_NAME})(?=\\s*(?:고객)?님|\\s*씨(?!\\p{L}))`, "gu"),
    group: 1,
    mask: maskName,
  },
  {
    // "이동훈 010-1234-5678"처럼 이름과 전화번호를 나란히 보내는 경우
    id: "PII_NAME",
    severity: INFO,
    priority: 10,
    // 같은 줄 안에서만 붙어 있는 것으로 본다. 줄바꿈을 넘으면 다음 줄 단어를 이름으로 오탐한다.
    re: new RegExp(`(?<![\\p{L}])(${CONTEXTLESS_NAME})(?=[ \\t]*[,/]?[ \\t]*${PHONE_NEAR_NAME})`, "gu"),
    group: 1,
    mask: maskName,
  },
  {
    id: "PII_NAME",
    severity: INFO,
    priority: 10,
    re: new RegExp(`(?<=${PHONE_NEAR_NAME}[ \\t]*[,/]?[ \\t]*)(${CONTEXTLESS_NAME})(?=$|[^\\p{L}]|입니다|이에요|예요|이고|님)`, "gu"),
    group: 1,
    mask: maskName,
  },
  {
    id: "PII_NAME",
    severity: INFO,
    priority: 10,
    isStandaloneName: true,
    // "좋아요", "그린힐" 같은 짧은 대답 오탐을 막기 위해 성씨로 시작하는 세 글자만 본다.
    re: new RegExp(`^\\s*(${CONTEXTLESS_NAME})\\s*$`, "gu"),
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

export function detectAndMaskPii(
  value,
  { ignoredRuleIds = [], detectStandaloneName = true } = {},
) {
  const text = typeof value === "string" ? value : "";
  const ignored = new Set(ignoredRuleIds);
  const matches = collectMatches(text).filter(({ rule }) =>
    !ignored.has(rule.id) && (detectStandaloneName || !rule.isStandaloneName)
  );
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
