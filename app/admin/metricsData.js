"use client";

import { createAuthBrowserClient } from "@/lib/supabaseAuth";

/**
 * 메트릭 데이터 조회·집계 (클라이언트 전용).
 *
 * 왜 서버 API 가 아니라 브라우저에서 직접 조회하나:
 *  - RLS 정책상 staff/admin 세션은 api_logs·security_events 를 직접 SELECT 할 수 있다
 *    (policies.sql: *_staff_read using is_staff()). 관리자 화면은 이미 staff 전용이다.
 *  - 그래서 새 /api/admin/* 라우트·report.js 수정·스키마 변경 없이 대시보드만으로 완결된다.
 *  - 덤: 이 조회는 서버 라우트(withApiLog)를 거치지 않아 스스로 api_logs 를 늘리지 않는다.
 *
 * 한계(정직하게): 집계를 브라우저에서 JS 로 한다. 행 수가 rowLimit 을 넘으면 근사값이 되고,
 * p95 도 버킷 내 표본 기준이다. 대용량이 되면 Postgres 집계(date_trunc + percentile_cont)를
 * RPC 로 옮기는 것이 정확하다 — 그 계층은 A 담당이라 다음 단계로 남긴다.
 */

export const WINDOWS = {
  "1h": { label: "최근 1시간", ms: 60 * 60 * 1000, buckets: 12, rowLimit: 2000, tick: "time" },
  "24h": { label: "최근 24시간", ms: 24 * 60 * 60 * 1000, buckets: 24, rowLimit: 5000, tick: "hour" },
  "7d": { label: "최근 7일", ms: 7 * 24 * 60 * 60 * 1000, buckets: 7, rowLimit: 5000, tick: "date" },
};

const pad = (n) => String(n).padStart(2, "0");

function bucketLabel(date, tick) {
  if (tick === "date") return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
  if (tick === "hour") return `${pad(date.getHours())}시`;
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function percentile(sortedAsc, p) {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(sortedAsc.length - 1, Math.ceil(p * sortedAsc.length) - 1);
  return sortedAsc[Math.max(0, idx)];
}

/**
 * @param {"1h"|"24h"|"7d"} windowKey
 * @returns {Promise<object>} { ok, ... } — useAdminResource 계약에 맞춘 형태
 */
export async function fetchMetrics(windowKey) {
  const win = WINDOWS[windowKey] ?? WINDOWS["1h"];
  const now = Date.now();
  const startMs = now - win.ms;
  const sinceIso = new Date(startMs).toISOString();
  const bucketMs = win.ms / win.buckets;

  const supabase = createAuthBrowserClient();

  const [apiRes, secRes] = await Promise.all([
    supabase
      .from("api_logs")
      .select("id, ts, status, duration_ms, method, path")
      .gte("ts", sinceIso)
      .order("ts", { ascending: false })
      .limit(win.rowLimit),
    supabase
      .from("security_events")
      .select("ts, severity")
      .gte("ts", sinceIso)
      .order("ts", { ascending: false })
      .limit(win.rowLimit),
  ]);

  if (apiRes.error) throw apiRes.error;
  if (secRes.error) throw secRes.error;

  const apiRows = apiRes.data ?? [];
  const secRows = secRes.data ?? [];

  const B = win.buckets;
  const idxOf = (ts) => {
    const i = Math.floor((new Date(ts).getTime() - startMs) / bucketMs);
    return Math.max(0, Math.min(B - 1, i));
  };

  // 버킷 라벨(각 버킷 시작 시각)
  const labels = Array.from({ length: B }, (_, i) =>
    bucketLabel(new Date(startMs + i * bucketMs), win.tick)
  );

  const req = new Array(B).fill(0);
  const err = new Array(B).fill(0);
  const durs = Array.from({ length: B }, () => []);
  const sevCritical = new Array(B).fill(0);
  const sevWarn = new Array(B).fill(0);
  const sevInfo = new Array(B).fill(0);

  const pathCount = new Map();
  let totalErr = 0;
  const allDurs = [];

  for (const r of apiRows) {
    const b = idxOf(r.ts);
    req[b] += 1;
    const status = Number(r.status) || 0;
    if (status >= 400) {
      err[b] += 1;
      totalErr += 1;
    }
    const d = Number(r.duration_ms);
    if (Number.isFinite(d)) {
      durs[b].push(d);
      allDurs.push(d);
    }
    if (r.path) pathCount.set(r.path, (pathCount.get(r.path) ?? 0) + 1);
  }

  const avg = durs.map((arr) =>
    arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0
  );
  const p95 = durs.map((arr) => percentile([...arr].sort((a, b) => a - b), 0.95));

  for (const r of secRows) {
    const b = idxOf(r.ts);
    if (r.severity === "critical") sevCritical[b] += 1;
    else if (r.severity === "warn") sevWarn[b] += 1;
    else if (r.severity === "info") sevInfo[b] += 1;
  }

  const topPaths = [...pathCount.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const recentLogs = apiRows.slice(0, 12).map((r) => ({
    id: r.id,
    ts: r.ts,
    method: r.method,
    path: r.path,
    status: r.status,
    durationMs: r.duration_ms,
  }));

  const totalReq = apiRows.length;
  const secTotal = secRows.length;

  return {
    ok: true,
    windowKey,
    labels,
    req,
    err,
    avg,
    p95,
    sevCritical,
    sevWarn,
    sevInfo,
    topPaths,
    recentLogs,
    capped: totalReq >= win.rowLimit,
    kpis: {
      totalReq,
      errorRate: totalReq ? Math.round((totalErr / totalReq) * 1000) / 10 : 0,
      avgMs: allDurs.length
        ? Math.round(allDurs.reduce((s, v) => s + v, 0) / allDurs.length)
        : 0,
      p95Ms: percentile([...allDurs].sort((a, b) => a - b), 0.95),
      secTotal,
      secCritical: sevCritical.reduce((s, v) => s + v, 0),
    },
  };
}
