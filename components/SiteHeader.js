import Link from "next/link";
import { getCurrentUser, isStaff } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";

/**
 * 모든 화면에서 인증과 예약 조회 진입점을 제공한다.
 * 로그인 여부는 브라우저가 전달한 값을 믿지 않고 서버에서 검증한다.
 */
export default async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-3">
        <Link href="/" className="text-lg font-bold text-brand">
          firebooking
        </Link>

        <nav aria-label="주요 메뉴" className="flex flex-wrap items-center justify-end gap-2">
          <Link
            href="/lookup"
            className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            예약 조회
          </Link>

          {user ? (
            <>
              <Link
                href="/my"
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                내 예약
              </Link>
              {isStaff(user) && (
                <Link
                  href="/admin"
                  className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  관리자
                </Link>
              )}
              <LogoutButton />
            </>
          ) : (
            <>
              <Link
                href="/signup"
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                회원가입
              </Link>
              <Link
                href="/login"
                className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition hover:opacity-90"
              >
                로그인
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
