"use client";

import { useState } from "react";
import { createAuthBrowserClient } from "@/lib/supabaseAuth";

export default function LogoutButton() {
  const [isPending, setIsPending] = useState(false);

  async function handleLogout() {
    setIsPending(true);
    const supabase = createAuthBrowserClient();
    await supabase.auth.signOut();
    // 뒤로 가기로 인증된 화면을 다시 보지 않도록 새 문서로 교체한다.
    window.location.replace("/");
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isPending}
      className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition hover:opacity-80 disabled:opacity-50"
    >
      {isPending ? "로그아웃 중…" : "로그아웃"}
    </button>
  );
}
