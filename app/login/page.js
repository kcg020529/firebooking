"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sessionExpired = searchParams.get("reason") === "session_expired";

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    let response;
    try {
      response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
    } catch {
      setError("로그인 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
      setIsSubmitting(false);
      return;
    }

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      const remaining = Number.isInteger(data?.remainingAttempts)
        ? ` (남은 시도 ${data.remainingAttempts}회)`
        : "";
      setError(`${data?.error ?? "로그인에 실패했습니다."}${remaining}`);
      setIsSubmitting(false);
      return;
    }

    // 새 문서 요청으로 이동해야 보호 페이지와 헤더가 같은 최신 쿠키를 읽는다.
    window.location.replace("/my");
  }

  return (
    <main className="flex-1 px-6 py-16">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-2xl font-bold">로그인</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          예약 내역을 확인하려면 로그인하세요.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">이메일</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">비밀번호</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </label>

          {(error || sessionExpired) && (
            <p role="alert" className="text-sm text-critical">
              {error ?? "30분 동안 활동이 없어 세션이 만료되었습니다. 다시 로그인해 주세요."}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? "로그인 중…" : "로그인"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          계정이 없으신가요?{" "}
          <Link href="/signup" className="font-medium text-brand underline underline-offset-2">
            회원가입
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="flex-1 px-6 py-16" />}>
      <LoginForm />
    </Suspense>
  );
}
