"use client";

import { useMemo, useState } from "react";
import {
  buildQuery,
  endOfDayIso,
  formatFullTimestamp,
  formatTimestamp,
  shortHash,
  startOfDayIso,
} from "@/lib/adminFormat";
import { useAdminResource } from "../useAdminResource";
import DashboardControls from "../DashboardControls";

/**
 * 보안 대시보드 — 탐지 이벤트 타임라인 · 심각도별 건수 · 규칙별 히트.
 *
 * 권한 검사는 app/admin/layout.js 가 이미 했다. 이 페이지가 렌더된다는 것
 * 자체가 staff/admin 이라는 뜻이므로 여기서 또 확인하지 않는다.
 *
 * 조회·5초 자동 갱신은 useAdminResource 훅이 맡는다(app/admin/useAdminResource.js).
 *
 * ⚠️ evidence 는 공격자가 넣은 문자열이 그대로 들어올 수 있는 필드다.
 *    반드시 텍스트로만 렌더한다 (dangerouslySetInnerHTML 금지).
 *    탐지 로그 화면이 XSS 경로가 되면 본말전도다.
 */

/** 심각도는 info / warn / critical 세 가지뿐. 네 번째를 만들지 않는다. */
const SEVERITY_ORDER = ["critical", "warn", "info"];

// 화면 표시는 상/중/하. 내부 값(security_events.severity)·API 는 info/warn/critical 로 유지한다.
// critical=상, warn=중, info=하 로 1:1 매핑한다.
const SEVERITY_META = {
  critical: { label: "상", text: "text-critical", bar: "bg-critical", pill: "bg-critical/10 text-critical" },
  warn: { label: "중", text: "text-warn", bar: "bg-warn", pill: "bg-warn/10 text-warn" },
  info: { label: "하", text: "text-info", bar: "bg-info", pill: "bg-info/10 text-info" },
};

const CATEGORY_LABEL = {
  pii: "개인정보",
  injection: "프롬프트 인젝션",
  anomaly: "이상 행위",
  authz: "권한",
  leak: "유출",
};

/** 심각도 배지 — 색만으로 구분하지 않도록 항상 글자를 같이 둔다. */
function SeverityBadge({ severity }) {
  const meta = SEVERITY_META[severity];
  if (!meta) return <span className="text-xs text-muted-foreground">{severity}</span>;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${meta.pill}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.bar}`} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

function StatTile({ label, value, tone = "text-foreground", accent = "border-border", hint }) {
  return (
    <div className={`rounded-xl border-l-4 ${accent} border-y border-r border-border bg-card p-4`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${tone}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const SEVERITY_ACCENT = {
  critical: "border-l-critical",
  warn: "border-l-warn",
  info: "border-l-info",
};

export default function SecurityDashboardPage() {
  const [severity, setSeverity] = useState("");
  const [category, setCategory] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [events, setEvents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [discordAlert, setDiscordAlert] = useState(null);

  // 필터가 바뀌면 url 이 바뀌고, 훅이 이를 감지해 다시 조회한다.
  const url = useMemo(() => {
    const query = buildQuery({
      severity,
      category,
      from: startOfDayIso(from),
      to: endOfDayIso(to),
    });
    return `/api/admin/events?${query}`;
  }, [severity, category, from, to]);

  const { isLoading, isRefreshing, error, loadedAt, autoRefresh, setAutoRefresh, refresh } =
    useAdminResource(url, {
      onData: (data) => {
        setEvents(data.events);
        setSummary(data.summary);
        setDiscordAlert(data.discordAlert ?? null);
      },
      onReset: () => {
        setEvents([]);
        setSummary(null);
        setDiscordAlert(null);
      },
      errorMessage: "보안 이벤트를 불러오지 못했습니다.",
    });

  const byRule = summary?.byRule ?? [];
  const maxRuleCount = byRule[0]?.count ?? 0;
  const hasFilter = Boolean(severity || category || from || to);

  return (
    <main className="flex-1 px-6 py-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">보안 대시보드</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              탐지 규칙에 걸린 이벤트를 최신순으로 보여줍니다.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Discord 긴급 알림:</span>
              {discordAlert?.configured ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                  설정됨
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" aria-hidden="true" />
                  미설정
                </span>
              )}
            </div>
          </div>

          <DashboardControls
            loadedAt={loadedAt}
            isRefreshing={isRefreshing}
            autoRefresh={autoRefresh}
            onToggleAuto={() => setAutoRefresh((on) => !on)}
            onRefresh={refresh}
          />
        </div>

        {/* 필터 */}
        <section className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">심각도</span>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="">전체</option>
              {SEVERITY_ORDER.map((value) => (
                <option key={value} value={value}>
                  {SEVERITY_META[value].label} ({value})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">분류</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="">전체</option>
              {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">시작일</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">종료일</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </label>

          {hasFilter && (
            <button
              type="button"
              onClick={() => {
                setSeverity("");
                setCategory("");
                setFrom("");
                setTo("");
              }}
              className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition hover:opacity-80"
            >
              필터 초기화
            </button>
          )}
        </section>

        {error && (
          <p className="mt-6 rounded-xl border border-critical/40 bg-critical/5 p-4 text-sm text-critical">
            {error}
          </p>
        )}

        {/* 심각도별 건수 */}
        <section className="mt-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold">현황</h2>
            {/*
              summary 는 기간 안의 최근 500건까지만 집계한다 (lib/security/report.js).
              "기간 전체"라고 쓰면 500건을 넘겼을 때 화면이 틀린 말을 하게 된다.
            */}
            <p className="text-xs text-muted-foreground">
              최근 500건 기준
              {(severity || category) && " · 심각도·분류 필터는 아래 목록에만 적용됩니다"}
            </p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <StatTile label="전체" value={summary?.total ?? "-"} />
            {SEVERITY_ORDER.map((value) => (
              <StatTile
                key={value}
                label={`${SEVERITY_META[value].label} (${value})`}
                value={summary?.bySeverity?.[value] ?? "-"}
                tone={SEVERITY_META[value].text}
                accent={SEVERITY_ACCENT[value]}
              />
            ))}
            <StatTile
              label="미처리"
              value={summary?.unhandled ?? "-"}
              hint="아직 확인하지 않은 이벤트"
            />
          </div>
        </section>

        {/* 규칙별 히트 */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold">규칙별 히트</h2>

          <div className="mt-3 rounded-xl border border-border bg-card p-4">
            {byRule.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {isLoading ? "불러오는 중입니다." : "해당 기간에 탐지된 이벤트가 없습니다."}
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {byRule.map(({ ruleId, count }) => {
                  const width = maxRuleCount > 0 ? (count / maxRuleCount) * 100 : 0;

                  return (
                    <li key={ruleId} className="flex items-center gap-3">
                      <span className="w-40 shrink-0 truncate font-mono text-xs" title={ruleId}>
                        {ruleId}
                      </span>

                      {/*
                        막대는 건수만 나타낸다. 규칙별 심각도는 summary 에 없어서
                        이벤트 목록에서 끌어와야 하는데, 그 목록은 필터·100건 상한이
                        걸려 있어 색이 규칙 전체를 대표하지 못한다.
                        심각도는 아래 타임라인에서 이벤트별로 정확히 보여준다.
                      */}
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <span
                          className="block h-full rounded-full bg-brand/70"
                          style={{ width: `${width}%` }}
                        />
                      </span>

                      <span className="w-10 shrink-0 text-right text-sm tabular-nums">{count}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* 이벤트 타임라인 */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold">이벤트 타임라인</h2>

          <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">시각</th>
                  <th className="px-4 py-3 font-medium">심각도</th>
                  <th className="px-4 py-3 font-medium">규칙</th>
                  <th className="px-4 py-3 font-medium">분류</th>
                  <th className="px-4 py-3 font-medium">근거</th>
                  <th className="px-4 py-3 font-medium">IP</th>
                  <th className="px-4 py-3 font-medium">처리</th>
                </tr>
              </thead>

              <tbody>
                {isLoading &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-4 py-3" colSpan={7}>
                        <div className="h-4 w-full animate-pulse rounded bg-muted" />
                      </td>
                    </tr>
                  ))}

                {!isLoading &&
                  events.map((event) => (
                    <tr
                      key={event.id}
                      className="border-b border-border transition-colors last:border-0 hover:bg-muted/40"
                    >
                      <td
                        className="whitespace-nowrap px-4 py-3 tabular-nums text-muted-foreground"
                        title={formatFullTimestamp(event.ts)}
                      >
                        {formatTimestamp(event.ts)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <SeverityBadge severity={event.severity} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                        {event.ruleId}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {CATEGORY_LABEL[event.category] ?? event.category}
                      </td>
                      {/* 텍스트 렌더만 한다 — React 가 이스케이프해준다. */}
                      <td className="max-w-md break-words px-4 py-3">{event.evidence}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">
                        {shortHash(event.ipHash)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs">
                        {event.handled ? (
                          <span className="text-muted-foreground">처리됨</span>
                        ) : (
                          <span className="font-medium text-warn">미처리</span>
                        )}
                      </td>
                    </tr>
                  ))}

                {!isLoading && events.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={7}>
                      조건에 맞는 이벤트가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            최신 100건까지 표시합니다. 더 좁혀 보려면 기간 필터를 사용하세요.
          </p>
        </section>
      </div>
    </main>
  );
}
