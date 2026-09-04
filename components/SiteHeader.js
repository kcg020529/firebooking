"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createAuthBrowserClient } from "@/lib/supabaseAuth";
import LogoutButton from "@/components/LogoutButton";

/**
 * 모든 화면에서 인증과 예약 조회 진입점을 제공한다.
 * 여기서 읽는 세션과 역할은 화면 표시용일 뿐 권한 판정에 사용하지 않는다.
 * 실제 접근 권한은 /my와 /admin의 서버 컴포넌트가 다시 검증한다.
 */
export default function SiteHeader() {
  const [viewer, setViewer] = useState(undefined);

  useEffect(() => {
    const supabase = createAuthBrowserClient();
    let isActive = true;
    let revision = 0;

    async function syncViewer(session) {
      const currentRevision = ++revision;
      const authUser = session?.user;

      if (!authUser) {
        if (isActive) setViewer(null);
        return;
      }

      const metadataName = authUser.user_metadata?.display_name;
      const fallbackName =
        typeof metadataName === "string" && metadataName.trim()
          ? metadataName.trim()
          : "회원";
      const nextViewer = {
        displayName: fallbackName,
        role: "user",
      };

      // 세션 변경 직후 로그인 상태를 먼저 보여주고, 역할은 본인 행만 RLS로 읽는다.
      if (isActive) setViewer(nextViewer);

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, role")
        .eq("id", authUser.id)
        .maybeSingle();

      if (!isActive || currentRevision !== revision) return;

      setViewer({
        displayName: profile?.display_name?.trim() || fallbackName,
        role: profile?.role ?? "user",
      });
    }

    supabase.auth.getSession().then(({ data }) => {
      void syncViewer(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncViewer(session);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

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

          {viewer ? (
            <>
              <span className="px-2 text-sm font-medium" aria-label="로그인한 사용자">
                {viewer.displayName}님
              </span>
              <Link
                href="/my"
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                내 예약
              </Link>
              {["staff", "admin"].includes(viewer.role) && (
                <Link
                  href="/admin"
                  className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  관리자
                </Link>
              )}
              <LogoutButton />
            </>
          ) : viewer === null ? (
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
          ) : (
            <span className="h-9 w-28 animate-pulse rounded-lg bg-muted" aria-hidden="true" />
          )}
        </nav>
      </div>
    </header>
  );
}
