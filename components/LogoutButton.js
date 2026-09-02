"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAuthBrowserClient } from "@/lib/supabaseAuth";

export default function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleLogout() {
    setIsPending(true);
    const supabase = createAuthBrowserClient();
    await supabase.auth.signOut();
    // 서버 컴포넌트가 세션 없어진 걸 알도록 갱신한다.
    router.refresh();
    router.push("/");
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
