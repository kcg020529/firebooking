export const KST_TIMEZONE = "Asia/Seoul";

const KST_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: KST_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function resolveDate(clock) {
  if (typeof clock === "function") {
    const value = clock();
    const resolved = value instanceof Date ? value : new Date(value);
    return Number.isNaN(resolved.getTime()) ? new Date() : resolved;
  }
  if (clock instanceof Date) {
    return Number.isNaN(clock.getTime()) ? new Date() : clock;
  }
  if (typeof clock === "number" || typeof clock === "string") {
    const resolved = new Date(clock);
    return Number.isNaN(resolved.getTime()) ? new Date() : resolved;
  }
  return new Date();
}

export function addDaysToYmd(ymdString, days) {
  const [year, month, day] = ymdString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function getDateContext(clock) {
  const now = resolveDate(clock);
  const today = KST_DATE_FORMATTER.format(now);
  const windowStart = addDaysToYmd(today, 1);
  const windowEnd = addDaysToYmd(today, 14);

  return {
    today,
    windowStart,
    windowEnd,
  };
}
