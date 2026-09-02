const SEVERITY_RANK = Object.freeze({
  info: 0,
  warn: 1,
  critical: 2,
});

export const INJECTION_BLOCK_REPLY = "예약 관련 문의만 도와드릴 수 있어요.";

export const INJECTION_RULES = Object.freeze([
  {
    id: "INJ_IGNORE",
    severity: "critical",
    re: /(이전|위의?|앞의?)\s*(지시|명령|규칙).{0,6}(무시|잊)/gi,
  },
  {
    id: "INJ_IGNORE_EN",
    severity: "critical",
    re: /ignore\s+(all\s+)?(previous|above|prior)/gi,
  },
  {
    id: "INJ_SYSPROMPT",
    severity: "critical",
    re: /(시스템\s*프롬프트|system\s*prompt|너의?\s*규칙|initial\s+instructions)/gi,
  },
  {
    id: "INJ_ROLE",
    severity: "warn",
    re: /(너는\s*이제|from\s+now\s+on\s+you|act\s+as|DAN\s*모드)/gi,
  },
  {
    id: "INJ_TOOL",
    severity: "critical",
    re: /(create_booking|service_role|SUPABASE_|sk-ant)/gi,
  },
  {
    id: "INJ_SQL",
    severity: "warn",
    re: /(union\s+select|drop\s+table|;\s*--)/gi,
  },
  {
    id: "INJ_XSS",
    severity: "warn",
    re: /(<script|onerror\s*=|javascript:)/gi,
  },
]);

function countMatches(text, rule) {
  const regex = new RegExp(rule.re.source, rule.re.flags);
  return Array.from(text.matchAll(regex)).length;
}

function getHighestSeverity(hits) {
  return hits.reduce((highest, hit) => {
    return SEVERITY_RANK[hit.severity] > SEVERITY_RANK[highest]
      ? hit.severity
      : highest;
  }, "info");
}

export function detectPromptInjection(value) {
  const text = typeof value === "string" ? value : "";
  const hits = [];

  for (const rule of INJECTION_RULES) {
    const count = countMatches(text, rule);

    if (count > 0) {
      hits.push({
        ruleId: rule.id,
        severity: rule.severity,
        count,
      });
    }
  }

  return {
    isBlocked: hits.length > 0,
    severity: hits.length > 0 ? getHighestSeverity(hits) : null,
    hits,
  };
}
