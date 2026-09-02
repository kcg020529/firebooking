const INFO = "info";
const CRITICAL = "critical";

function maskName(name) {
  if (name.length <= 1) {
    return "*";
  }

  if (name.length === 2) {
    return `${name[0]}*`;
  }

  return `${name[0]}${"*".repeat(name.length - 2)}${name.at(-1)}`;
}

export const PII_RULES = Object.freeze([
  {
    id: "PII_PHONE",
    severity: INFO,
    re: /01[016789][-. ]?\d{3,4}[-. ]?\d{4}/g,
    mask: (match) => `${match.slice(0, 3)}-****-${match.slice(-4)}`,
  },
  {
    id: "PII_RRN",
    severity: CRITICAL,
    re: /\d{6}[-. ]?[1-4]\d{6}/g,
    mask: () => "******-*******",
  },
  {
    id: "PII_CARD",
    severity: CRITICAL,
    re: /\d{4}[-. ]?\d{4}[-. ]?\d{4}[-. ]?\d{4}/g,
    mask: (match) => `****-****-****-${match.replace(/\D/g, "").slice(-4)}`,
  },
  {
    id: "PII_EMAIL",
    severity: INFO,
    re: /[\w.+-]+@[\w-]+\.[\w.-]+/g,
    mask: (match) => {
      const [localPart, domain] = match.split("@");
      return `${localPart[0]}***@${domain}`;
    },
  },
  {
    id: "PII_NAME",
    severity: INFO,
    re: /((?:이름은?|성함은?)\s*)([가-힣]{2,4})(?=\s|입니다|이고|$)|(저는\s*)([가-힣]{2,4})(?=입니다|이고|이에요|예요|$)/g,
    mask: (match, strongPrefix, strongName, introPrefix, introName) => {
      const prefix = strongPrefix ?? introPrefix;
      const name = strongName ?? introName;
      return `${prefix}${maskName(name)}`;
    },
  },
]);

function replaceWithRule(text, rule) {
  let count = 0;
  const regex = new RegExp(rule.re.source, rule.re.flags);
  const maskedText = text.replace(regex, (...args) => {
    count += 1;
    return rule.mask(...args);
  });

  return { maskedText, count };
}

export function detectAndMaskPii(value) {
  const text = typeof value === "string" ? value : "";
  const hits = [];
  let maskedText = text;

  for (const rule of PII_RULES) {
    const result = replaceWithRule(maskedText, rule);
    maskedText = result.maskedText;

    if (result.count > 0) {
      hits.push({
        ruleId: rule.id,
        severity: rule.severity,
        count: result.count,
      });
    }
  }

  return { maskedText, hits };
}

export function hasPii(value) {
  return detectAndMaskPii(value).hits.length > 0;
}

export function createMaskedEvidence(value, maxLength = 160) {
  const safeMaxLength = Number.isInteger(maxLength) && maxLength > 0 ? maxLength : 160;
  const { maskedText } = detectAndMaskPii(value);
  return maskedText.slice(0, safeMaxLength);
}
