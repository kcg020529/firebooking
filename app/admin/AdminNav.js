"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * 관리자 상단 탭 네비게이션.
 *
 * ⚠️ 클라이언트 컴포넌트인 이유: 활성 탭 표시(초록 바)를 usePathname 으로 판정한다.
 *    이 판정을 서버 레이아웃에서 하면, 같은 레이아웃을 공유하는 페이지끼리
 *    (예: /admin/security ↔ /admin/audit) soft navigation 할 때 레이아웃이 다시
 *    렌더되지 않아 초록 바가 처음 위치에 멈춘다. usePathname 은 이동마다 갱신되므로
 *    탭 표시가 현재 경로를 따라간다.
 */
const ADMIN_TABS = [
  { href: "/admin", label: "메트릭", exact: true },
  { href: "/admin/security", label: "보안 대시보드" },
  { href: "/admin/audit", label: "감사 로그" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border bg-card">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-1 px-6">
        {ADMIN_TABS.map((tab) => {
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={`-mb-px border-b-2 px-3 py-3 text-sm transition ${
                isActive
                  ? "border-brand font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
        <Link
          href="/"
          className="ml-auto px-3 py-3 text-sm text-muted-foreground transition hover:text-foreground"
        >
          사이트로 ↗
        </Link>
      </div>
    </nav>
  );
}
