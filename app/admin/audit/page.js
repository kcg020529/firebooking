"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  buildQuery,
  endOfDayIso,
  formatFullTimestamp,
  formatTimestamp,
  shortHash,
  startOfDayIso,
} from "@/lib/adminFormat";

/**
 * 감사 로그 — 누가 · 언제 · 무엇을 했고 허용/거부됐는지.
 *
 * 권한 검사는 app/admin/layout.js 담당이다. 여기서 또 하지 않는다.
 *
 * deny 를 눈에 띄게 두는 게 이 화면의 핵심이다. 한 건의 거부는 오타지만
 * 같은 행위자가 짧은 시간에 반복해서 거부되면 공격 신호다.
 */

/** lib/security/audit.js 의 AUDIT_ACTIONS 와 같은 목록. */
const ACTION_LABEL = {
  "booking.create": "예약 생성",
  "booking.lookup": "예약 조회",
  "admin.view": "관리자 조회",
  "auth.login": "로그인",
  "chat.message": "챗봇 대화",
};

const RESULT_META = {
  allow: { label: "허용", text: "text-muted-foreground", dot: "bg-muted-foreground" },
  deny: { label: "거부", text: "text-critical", dot: "bg-critical" },
};

/** 결과 배지 — 색만으로 구분하지 않도록 항상 글자를 같이 둔다. */
function ResultBadge({ result }) {
  const meta = RESULT_META[result];
  if (!meta) return <span className="text-xs text-muted-foreground">{result}</span>;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${meta.text}`}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

export default function AuditLogPage() {
  const [actorId, setActorId] = useState("");
  const [action, setAction] = useState("");
  const [result, setResult] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadedAt, setLoadedAt] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isStale = false;

    async function fetchLogs() {
      setIsLoading(true);
      setError(null);

      const query = buildQuery({
        actorId: actorId.trim(),
        action,
        result,
        from: startOfDayIso(from),
        to: endOfDayIso(to),
      });

      try {
        const res = await fetch(`/api/admin/audit?${query}`);
        const data = await res.json();

        if (isStale) return;

        if (!data.ok) {
          setError(data.error);
          return;
        }

        setLogs(data.logs);
        setLoadedAt(new Date());
      } catch {
        if (!isStale) setError("감사 로그를 불러오지 못했습니다.");
      } finally {
        if (!isStale) setIsLoading(false);
      }
    }

    fetchLogs();

    // 필터를 빠르게 바꿨을 때 이전 응답이 나중에 도착해 화면을 덮는 것을 막는다.
    return () => {
      isStale = true;
    };
  }, [actorId, action, result, from, to, reloadKey]);

  const denyCount = useMemo(
    () => logs.filter((log) => log.result === "deny").length,
    [logs]
  );

  const hasFilter = Boolean(actorId || action || result || from || to);

  return (
    <main className="flex-1 px-6 py-10">
      <div className="mx-auto w-full max-w-6xl">
        <Link href="/admin" className="text-sm text-muted-foreground transition hover:opacity-80">
          ← 관리자
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">감사 로그</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              누가 언제 무엇을 했고, 허용됐는지 거부됐는지 기록입니다.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {loadedAt && (
              <span className="text-xs text-muted-foreground">
                {formatTimestamp(loadedAt)} 기준
              </span>
            )}
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              disabled={isLoading}
              className="rounded-lg border border-border px-3 py-1.5 text-sm transition hover:opacity-80 disabled:opacity-50"
            >
              새로고침
            </button>
          </div>
        </div>

        {/* 필터 */}
        <section className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">행위자 ID</span>
            <input
              type="text"
              value={actorId}
              onChange={(e) => setActorId(e.target.value)}
              placeholder="UUID"
              className="w-56 rounded-lg border border-border bg-card px-3 py-2 font-mono text-xs outline-none focus:border-brand"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">액션</span>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="">전체</option>
              {Object.entries(ACTION_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label} ({value})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">결과</span>
            <select
              value={result}
              onChange={(e) => setResult(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="">전체</option>
              <option value="deny">거부 (deny)</option>
              <option value="allow">허용 (allow)</option>
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
                setActorId("");
                setAction("");
                setResult("");
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
          <p className="mt-6 rounded-xl border border-critical/40 bg-card p-4 text-sm text-critical">
            {error}
          </p>
        )}

        {/* 표시된 로그 요약 — 거부가 몇 건인지 먼저 보이게 */}
        <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            {isLoading ? "불러오는 중" : `${logs.length}건 표시`}
          </span>
          {!isLoading && denyCount > 0 && (
            <span className="font-medium text-critical">거부 {denyCount}건</span>
          )}
          {!isLoading && result !== "deny" && denyCount > 0 && (
            <button
              type="button"
              onClick={() => setResult("deny")}
              className="rounded-lg border border-critical/40 px-3 py-1.5 text-xs text-critical transition hover:opacity-80"
            >
              거부만 보기
            </button>
          )}
        </div>

        {/* 로그 테이블 */}
        <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[56rem] text-left text-sm">
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">시각</th>
                <th className="px-4 py-3 font-medium">행위자</th>
                <th className="px-4 py-3 font-medium">역할</th>
                <th className="px-4 py-3 font-medium">액션</th>
                <th className="px-4 py-3 font-medium">대상</th>
                <th className="px-4 py-3 font-medium">IP</th>
                <th className="px-4 py-3 font-medium">결과</th>
              </tr>
            </thead>

            <tbody>
              {isLoading &&
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-4 py-3" colSpan={7}>
                      <div className="h-4 w-full animate-pulse rounded bg-muted" />
                    </td>
                  </tr>
                ))}

              {!isLoading &&
                logs.map((log) => (
                  <tr
                    key={log.id}
                    // 거부는 줄 전체를 옅게 물들여서 표를 훑을 때 바로 눈에 들어오게 한다.
                    className={`border-b border-border last:border-0 ${
                      log.result === "deny" ? "bg-critical/5" : ""
                    }`}
                  >
                    <td
                      className="whitespace-nowrap px-4 py-3 tabular-nums text-muted-foreground"
                      title={formatFullTimestamp(log.ts)}
                    >
                      {formatTimestamp(log.ts)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs" title={log.actorId ?? ""}>
                      {log.actorId ? log.actorId.slice(0, 8) : "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {log.actorRole}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {ACTION_LABEL[log.action] ?? log.action}
                      <span className="ml-2 font-mono text-xs text-muted-foreground">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {log.targetType ? (
                        <>
                          <span>{log.targetType}</span>
                          {log.targetId && (
                            <span className="ml-2 font-mono text-xs">{log.targetId}</span>
                          )}
                        </>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">
                      {shortHash(log.ipHash)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <ResultBadge result={log.result} />
                    </td>
                  </tr>
                ))}

              {!isLoading && logs.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={7}>
                    조건에 맞는 기록이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          최신 100건까지 표시합니다. 행위자 ID·기간으로 좁혀 보세요.
        </p>
      </div>
    </main>
  );
}
