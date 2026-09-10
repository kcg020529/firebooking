import Link from "next/link";
import { headers } from "next/headers";
import { getCurrentUser, isStaff } from "@/lib/auth";
import { recordAdminAccess, recordUnauthorizedAdminAccess } from "@/lib/security/authz";

/**
 * /admin/* 전체를 감싸는 권한 가드.
 *
 * ⚠️ B 가 만드는 대시보드 페이지들은 이 레이아웃 안에 들어온다.
 *    각 페이지에서 권한 검사를 따로 하지 않아도 여기서 한 번에 막힌다.
 *    페이지를 추가할 때 검사를 빼먹는 사고를 구조적으로 없애기 위함이다.
 *
 * 접근 거부를 404 가 아니라 화면으로 보여주는 이유:
 * 시연에서 "막혔다"는 사실과 대시보드에 뜬 이벤트를 나란히 보여줘야 한다.
 */
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }) {
  const headerList = await headers();
  const path = headerList.get("x-pathname") ?? "/admin";

  const user = await getCurrentUser();

  if (!isStaff(user)) {
    await recordUnauthorizedAdminAccess({ path, user });

    return (
      <main className="flex-1 px-6 py-16">
        <div className="mx-auto w-full max-w-md rounded-xl border border-critical/40 bg-card p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-critical">
            Access denied
          </p>
          <h1 className="mt-3 text-xl font-bold">접근 권한이 없습니다</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            관리자 영역은 staff 또는 admin 역할만 이용할 수 있습니다.
            {user ? ` 현재 역할: ${user.role}` : " 로그인이 필요합니다."}
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            이 접근 시도는 보안 이벤트로 기록되었습니다.
          </p>

          <div className="mt-6 flex justify-center gap-2">
            <Link
              href="/"
              className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground"
            >
              홈으로
            </Link>
            {!user && (
              <Link
                href="/login"
                className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground"
              >
                로그인
              </Link>
            )}
          </div>
        </div>
      </main>
    );
  }

  await recordAdminAccess({ path, user });

  return <AdminShell path={path}>{children}</AdminShell>;
}

/** staff/admin 전용 공통 셸 — 상단 탭으로 대시보드 간 이동을 통일한다. */
const ADMIN_TABS = [
  { href: "/admin", label: "홈", exact: true },
  { href: "/admin/security", label: "보안 대시보드" },
  { href: "/admin/audit", label: "감사 로그" },
];

function AdminShell({ path, children }) {
  return (
    <div className="flex min-h-screen flex-col">
      <nav className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-1 px-6">
          {ADMIN_TABS.map((tab) => {
            const isActive = tab.exact ? path === tab.href : path.startsWith(tab.href);
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
      {children}
    </div>
  );
}
