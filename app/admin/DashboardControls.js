"use client";

import { formatTimestamp } from "@/lib/adminFormat";

/**
 * 대시보드 우상단 공통 컨트롤 — 갱신 상태 표시 + 자동/수동 갱신.
 *
 * 보안 대시보드와 감사 로그가 똑같은 컨트롤을 쓰므로 한 컴포넌트로 모은다.
 * 화면마다 갱신 UI 가 미묘하게 달라지면 "같은 대시보드인데 왜 다르지" 하는
 * 혼란이 생긴다.
 */
export default function DashboardControls({
  loadedAt,
  isRefreshing,
  autoRefresh,
  onToggleAuto,
  onRefresh,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* 갱신 상태 — 자동 갱신이 켜져 있으면 초록 점이 깜빡여 '살아있음'을 보여준다. */}
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${
            autoRefresh ? "animate-pulse bg-brand" : "bg-muted-foreground/40"
          }`}
          aria-hidden="true"
        />
        {isRefreshing
          ? "갱신 중…"
          : loadedAt
            ? `${formatTimestamp(loadedAt)} 기준`
            : "불러오는 중"}
      </span>

      {/* 자동 갱신 토글 — 켜짐이 기본. 조회 때마다 감사 로그가 쌓이므로 끌 수 있게 둔다. */}
      <button
        type="button"
        onClick={onToggleAuto}
        aria-pressed={autoRefresh}
        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:opacity-80 ${
          autoRefresh
            ? "border-brand/40 bg-brand/10 text-brand"
            : "border-border text-muted-foreground"
        }`}
      >
        {autoRefresh ? "자동 갱신 5초" : "자동 갱신 꺼짐"}
      </button>

      <button
        type="button"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="rounded-lg border border-border px-3 py-1.5 text-sm transition hover:opacity-80 disabled:opacity-50"
      >
        새로고침
      </button>
    </div>
  );
}
