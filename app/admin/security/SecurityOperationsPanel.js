"use client";

import { useCallback, useEffect, useState } from "react";
import { formatFullTimestamp, shortHash } from "@/lib/adminFormat";

export default function SecurityOperationsPanel({ isAdmin }) {
  const [health, setHealth] = useState({ state: "checking", checkedAt: null, latencyMs: null });
  const [blocks, setBlocks] = useState([]);
  const [cloudflareConfigured, setCloudflareConfigured] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    const startedAt = Date.now();
    try {
      const [healthResponse, blocksResponse] = await Promise.all([
        fetch("/api/health", { cache: "no-store" }),
        fetch("/api/admin/blocks", { cache: "no-store" }),
      ]);
      const healthData = await healthResponse.json().catch(() => null);
      const blocksData = await blocksResponse.json().catch(() => null);
      setHealth({
        state: healthResponse.ok && healthData?.database === "ok" ? "ok" : "degraded",
        database: healthData?.database ?? "unavailable",
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - startedAt,
      });
      if (blocksResponse.ok && blocksData?.ok) {
        setBlocks(blocksData.blocks ?? []);
        setCloudflareConfigured(Boolean(blocksData.cloudflareConfigured));
        setError(null);
      } else {
        setError(blocksData?.error ?? "IP 차단 목록을 불러오지 못했습니다.");
      }
    } catch {
      setHealth({ state: "down", database: "unknown", checkedAt: new Date().toISOString(), latencyMs: null });
    }
  }, []);

  useEffect(() => {
    const initial = setTimeout(refresh, 0);
    const timer = setInterval(refresh, 15000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [refresh]);

  async function handleRelease(block) {
    if (!window.confirm("이 IP의 앱·Cloudflare 차단을 해제할까요?")) return;
    setError(null);
    const response = await fetch(`/api/admin/blocks/${block.id}`, { method: "DELETE" });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      setError(data?.error ?? "차단을 해제하지 못했습니다.");
      return;
    }
    await refresh();
  }

  const healthMeta = {
    checking: ["확인 중", "text-muted-foreground", "bg-muted-foreground"],
    ok: ["정상", "text-emerald-600 dark:text-emerald-400", "bg-emerald-500"],
    degraded: ["DB 장애", "text-warn", "bg-warn"],
    down: ["응답 없음", "text-critical", "bg-critical"],
  }[health.state];

  return (
    <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_2fr]">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">서버 상태</h2>
          <span className={`inline-flex items-center gap-2 text-sm font-medium ${healthMeta[1]}`}>
            <span className={`h-2 w-2 rounded-full ${healthMeta[2]}`} />{healthMeta[0]}
          </span>
        </div>
        <dl className="mt-3 grid grid-cols-[6rem_1fr] gap-y-1 text-xs text-muted-foreground">
          <dt>데이터베이스</dt><dd>{health.database ?? "확인 중"}</dd>
          <dt>응답 시간</dt><dd>{health.latencyMs == null ? "-" : `${health.latencyMs}ms`}</dd>
          <dt>마지막 확인</dt><dd>{health.checkedAt ? formatFullTimestamp(health.checkedAt) : "-"}</dd>
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">15초마다 앱과 DB를 함께 확인합니다.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">IP 차단 현황</h2>
          <span className={`text-xs ${cloudflareConfigured ? "text-emerald-600 dark:text-emerald-400" : "text-warn"}`}>
            Cloudflare {cloudflareConfigured ? "연결됨" : "환경변수 미설정"}
          </span>
        </div>
        {error && <p className="mt-2 text-xs text-critical">{error}</p>}
        <div className="mt-3 max-h-52 overflow-auto">
          {blocks.length === 0 ? (
            <p className="text-sm text-muted-foreground">차단 기록이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {blocks.map((block) => (
                <li key={block.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-xs">
                  <div>
                    <span className="font-mono">{shortHash(block.ipHash)}</span>
                    <span className="ml-2 text-muted-foreground">{block.reason}</span>
                    <div className="mt-1 text-muted-foreground">
                      {block.isActive ? "차단 중" : "해제됨"} · {block.status} · 앞단 차단 이후 앱 거부 {block.blockedRequests ?? 0}회
                    </div>
                  </div>
                  {isAdmin && block.isActive && (
                    <button type="button" onClick={() => handleRelease(block)} className="rounded-md border border-border px-2 py-1 hover:bg-muted">
                      차단 해제
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
