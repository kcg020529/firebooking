"use client";

import { useState } from "react";
import { TYPE_LABEL } from "@/lib/courseType";

export default function LookupPage() {
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBookings(null);
    setIsSubmitting(true);

    try {
      const query = new URLSearchParams({ code, phone });
      const res = await fetch(`/api/bookings/lookup?${query}`);
      const data = await res.json();

      if (!data.ok) {
        setError(data.error);
        return;
      }
      setBookings(data.bookings);
    } catch {
      setError("예약을 조회하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex-1 px-6 py-16">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-2xl font-bold">예약 조회</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          예약번호와 예약 시 입력한 전화번호를 함께 입력해주세요.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">예약번호</span>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="GB-XXXXX"
              className="rounded-lg border border-border bg-card px-3 py-2 font-mono text-sm outline-none focus:border-brand"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">전화번호</span>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-1234-5678"
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </label>

          {error && (
            <p role="alert" className="text-sm text-critical">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? "조회 중…" : "조회하기"}
          </button>
        </form>

        {bookings?.map((b) => (
          <div
            key={b.bookingCode}
            className="mt-6 rounded-xl border border-border bg-card p-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold">{b.courseName}</h2>
              <span className="font-mono text-sm text-muted-foreground">
                {b.bookingCode}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {TYPE_LABEL[b.courseType] ?? b.courseType} · {b.date}{" "}
              {String(b.time).slice(0, 5)} · {b.partySize}명
            </p>
            {b.memo && (
              <p className="mt-2 text-xs text-muted-foreground">메모: {b.memo}</p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
