"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createAuthBrowserClient } from "@/lib/supabaseAuth";

/** Supabase Auth 기본 최소 길이와 맞춘다. */
const PASSWORD_MIN_LENGTH = 6;

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(`비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`);
      return;
    }

    setIsSubmitting(true);

    const supabase = createAuthBrowserClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      // profiles 트리거가 이 값을 읽어 display_name 을 채운다.
      options: { data: { display_name: displayName.trim() || null } },
    });

    if (signUpError) {
      setError(
        signUpError.message.includes("already registered")
          ? "이미 가입된 이메일입니다."
          : "회원가입에 실패했습니다. 잠시 후 다시 시도해주세요."
      );
      setIsSubmitting(false);
      return;
    }

    // 이메일 인증이 켜져 있으면 session 이 없다. 그때는 안내만 하고 끝낸다.
    if (!data.session) {
      setNotice("가입 확인 메일을 보냈습니다. 메일함을 확인해주세요.");
      setIsSubmitting(false);
      return;
    }

    router.refresh();
    router.push("/my");
  }

  return (
    <main className="flex-1 px-6 py-16">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-2xl font-bold">회원가입</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          가입하면 예약 내역을 한곳에서 볼 수 있습니다.
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
            <span className="text-sm font-medium">이름</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
              maxLength={20}
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              비밀번호
              <span className="ml-1 font-normal text-muted-foreground">
                ({PASSWORD_MIN_LENGTH}자 이상)
              </span>
            </span>
            <input
              type="password"
              required
              minLength={PASSWORD_MIN_LENGTH}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </label>

          {error && (
            <p role="alert" className="text-sm text-critical">
              {error}
            </p>
          )}
          {notice && <p className="text-sm text-brand">{notice}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? "가입 중…" : "가입하기"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="font-medium text-brand underline underline-offset-2">
            로그인
          </Link>
        </p>
      </div>
    </main>
  );
}
