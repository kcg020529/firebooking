"use client";

import { useCallback, useMemo, useState } from "react";
import { formatFullTimestamp, formatTimestamp } from "@/lib/adminFormat";
import { useAdminResource } from "./useAdminResource";
import DashboardControls from "./DashboardControls";
import TimeSeriesChart from "@/components/charts/TimeSeriesChart";
import BarList from "@/components/charts/BarList";
import { WINDOWS, fetchMetrics } from "./metricsData";

/**
 * 관리자 홈(/admin) — 메트릭 대시보드.
 *
 * 서버 운영 지표(api_logs)와 보안 이벤트 추이를 시계열로 보여준다.
 * 데이터는 브라우저에서 Supabase 를 직접 조회한다(metricsData.js 참고). 권한 검사는
 * app/admin/layout.js 가 이미 했다. 조회·5초 자동 갱신은 useAdminResource 훅이 맡는다.
 */

const WINDOW_KEYS = ["1h", "24h", "7d"];

const ms = (n) => `${n} ms`;

function KpiTile({ label, value, unit, tone = "text-foreground", accent = "border-l-border" }) {
  return (
    <div className={`rounded-xl border-l-4 ${accent} border-y border-r border-border bg-card p-4`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${tone}`}>
        {value}
        {unit && <span className="ml-1 text-sm font-medium text-muted-foreground">{unit}</span>}
      </p>
    </div>
  );
}

function Panel({ title, hint, children }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function statusTone(status) {
  const s = Number(status) || 0;
  if (s >= 500) return "text-critical";
  if (s >= 400) return "text-warn";
  return "text-muted-foreground";
}

export default function AdminMetricsHomePage() {
  const [windowKey, setWindowKey] = useState("1h");
  const [data, setData] = useState(null);

  // windowKey 가 바뀌면 fetcher 정체성이 바뀌어 훅이 다시 조회한다.
  const fetcher = useCallback(() => fetchMetrics(windowKey), [windowKey]);

  const { isLoading, isRefreshing, error, loadedAt, autoRefresh, setAutoRefresh, refresh } =
    useAdminResource(fetcher, {
      onData: setData,
      onReset: () => setData(null),
      errorMessage: "메트릭을 불러오지 못했습니다.",
    });

  const k = data?.kpis;

  const reqSeries = useMemo(
    () => (data ? [{ name: "요청", color: "var(--brand)", values: data.req, area: true }] : []),
    [data]
  );
  const errSeries = useMemo(
    () => (data ? [{ name: "에러", color: "var(--critical)", values: data.err, area: true }] : []),
    [data]
  );
  const latencySeries = useMemo(
    () =>
      data
        ? [
            { name: "평균", color: "var(--muted-foreground)", values: data.avg },
            { name: "p95", color: "var(--warn)", values: data.p95 },
          ]
        : [],
    [data]
  );
  const secSeries = useMemo(
    () =>
      data
        ? [
            { name: "상(critical)", color: "var(--critical)", values: data.sevCritical },
            { name: "중(warn)", color: "var(--warn)", values: data.sevWarn },
            { name: "하(info)", color: "var(--info)", values: data.sevInfo },
          ]
        : [],
    [data]
  );

  const labels = data?.labels ?? [];

  return (
    <main className="flex-1 px-6 py-10">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">메트릭</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              API 운영 지표와 보안 이벤트 추이를 시계열로 보여줍니다.
            </p>
          </div>

          <DashboardControls
            loadedAt={loadedAt}
            isRefreshing={isRefreshing}
            autoRefresh={autoRefresh}
            onToggleAuto={() => setAutoRefresh((on) => !on)}
            onRefresh={refresh}
          />
        </div>

        {/* 기간 선택 */}
        <div className="mt-6 inline-flex rounded-lg border border-border bg-card p-1">
          {WINDOW_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setWindowKey(key)}
              aria-pressed={windowKey === key}
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                windowKey === key
                  ? "bg-brand/10 font-medium text-brand"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {WINDOWS[key].label}
            </button>
          ))}
        </div>

        {error && (
          <p className="mt-6 rounded-xl border border-critical/40 bg-critical/5 p-4 text-sm text-critical">
            {error}
          </p>
        )}

        {data?.capped && (
          <p className="mt-4 rounded-xl border border-warn/40 bg-warn/5 p-3 text-xs text-warn">
            표본이 상한({WINDOWS[windowKey].rowLimit.toLocaleString()}건)에 도달해 일부 구간이 근사값일 수 있습니다.
          </p>
        )}

        {/* KPI */}
        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <KpiTile label="총 요청" value={isLoading ? "-" : (k?.totalReq ?? 0).toLocaleString()} />
          <KpiTile
            label="에러율"
            value={isLoading ? "-" : (k?.errorRate ?? 0)}
            unit="%"
            tone={k && k.errorRate > 0 ? "text-critical" : "text-foreground"}
            accent={k && k.errorRate > 0 ? "border-l-critical" : "border-l-border"}
          />
          <KpiTile label="평균 응답" value={isLoading ? "-" : (k?.avgMs ?? 0)} unit="ms" />
          <KpiTile label="p95 응답" value={isLoading ? "-" : (k?.p95Ms ?? 0)} unit="ms" tone="text-warn" accent="border-l-warn" />
          <KpiTile
            label="보안 이벤트"
            value={isLoading ? "-" : (k?.secTotal ?? 0)}
            tone={k && k.secCritical > 0 ? "text-critical" : "text-foreground"}
            accent={k && k.secCritical > 0 ? "border-l-critical" : "border-l-border"}
          />
        </section>

        {/* 시계열 패널 그리드 */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Panel title="요청량" hint="버킷당 요청 수">
            <TimeSeriesChart series={reqSeries} labels={labels} />
          </Panel>
          <Panel title="에러 응답 (4xx·5xx)" hint="버킷당 에러 수">
            <TimeSeriesChart series={errSeries} labels={labels} />
          </Panel>
          <Panel title="응답시간" hint="평균 · p95 (ms)">
            <TimeSeriesChart series={latencySeries} labels={labels} formatValue={ms} />
          </Panel>
          <Panel title="보안 이벤트 추이" hint="심각도별 발생 수">
            <TimeSeriesChart series={secSeries} labels={labels} />
          </Panel>
        </div>

        {/* Top 엔드포인트 + 최근 로그 */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Panel title="Top 엔드포인트" hint="호출 수 상위">
            <BarList items={data?.topPaths ?? []} formatValue={(n) => n.toLocaleString()} />
          </Panel>

          <Panel title="최근 API 로그" hint="최신 12건">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[24rem] text-left text-xs">
                <thead className="border-b border-border text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3 font-medium">시각</th>
                    <th className="py-2 pr-3 font-medium">메서드</th>
                    <th className="py-2 pr-3 font-medium">경로</th>
                    <th className="py-2 pr-3 font-medium">상태</th>
                    <th className="py-2 font-medium">ms</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.recentLogs ?? []).map((log) => (
                    <tr key={log.id} className="border-b border-border last:border-0">
                      <td
                        className="whitespace-nowrap py-2 pr-3 tabular-nums text-muted-foreground"
                        title={formatFullTimestamp(log.ts)}
                      >
                        {formatTimestamp(log.ts)}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-3 font-mono">{log.method}</td>
                      <td className="max-w-[12rem] truncate py-2 pr-3 font-mono" title={log.path}>
                        {log.path}
                      </td>
                      <td className={`whitespace-nowrap py-2 pr-3 font-mono tabular-nums ${statusTone(log.status)}`}>
                        {log.status}
                      </td>
                      <td className="whitespace-nowrap py-2 tabular-nums text-muted-foreground">
                        {log.durationMs ?? "-"}
                      </td>
                    </tr>
                  ))}
                  {!isLoading && (data?.recentLogs?.length ?? 0) === 0 && (
                    <tr>
                      <td className="py-6 text-center text-muted-foreground" colSpan={5}>
                        기간 내 API 로그가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          집계는 브라우저에서 계산합니다. 정확한 백분위·대용량 집계는 추후 DB 집계(RPC)로 옮길 수 있습니다.
        </p>
      </div>
    </main>
  );
}
