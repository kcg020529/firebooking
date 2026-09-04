"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { formatDateLabel, formatTimeLabel } from "@/lib/dateLabel";
import { MAX_PARTY_SIZE, NAME_MAX_LENGTH, MEMO_MAX_LENGTH } from "@/lib/bookingLimits";
import { TYPE_LABEL } from "@/lib/courseType";
import { useSlot } from "@/lib/useSlot";

function BookForm() {
  const router = useRouter();
  const { slotId } = useParams();

  const { course, slot, isLoading, error: loadError } = useSlot(slotId);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState(1);
  const [memo, setMemo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const paramError = !slotId
    ? "예약 정보가 올바르지 않습니다. 목록에서 시간을 다시 선택해주세요."
    : null;


  async function handleSubmit(e) {
    e.preventDefault();
    // 버튼의 disabled 는 리렌더가 반영되기 전까지의 틈을 못 막는다.
    // Enter 키로 폼을 제출하면 버튼 클릭을 거치지 않아 disabled 도 우회된다.
    if (isSubmitting) return;

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId,
          name,
          phone,
          partySize,
          memo,
          source: "form",
        }),
      });
      const data = await res.json();

      if (!data.ok) {
        // 서버 문구는 사용자에게 그대로 보여줄 용도로 쓰여 있다.
        setSubmitError(data.error);
        setIsSubmitting(false);
        return;
      }

      // 응답에는 예약번호만 온다. 이름·전화번호는 되돌려주지 않는 설계다.
      // 완료 화면이 무엇을 예약했는지 보여줄 수 있도록 slotId 만 넘긴다.
      const summary = new URLSearchParams({ slotId });
      router.push(`/booking/${data.bookingCode}?${summary}`);
    } catch {
      setSubmitError("예약을 완료하지 못했습니다. 잠시 후 다시 시도해주세요.");
      setIsSubmitting(false);
    }
  }

  const displayError = paramError ?? loadError;

  if (displayError) {
    return (
      <div className="mx-auto w-full max-w-md text-center">
        <p role="alert" className="text-sm text-critical">
          {displayError}
        </p>
        <Link
          href={course ? `/courses/${course.id}` : "/"}
          className="mt-4 inline-block text-sm font-medium text-brand underline underline-offset-2"
        >
          시간 다시 선택하기
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-md animate-pulse">
        <div className="h-32 rounded-xl border border-border bg-card" />
        <div className="mt-8 h-10 rounded-lg bg-muted" />
        <div className="mt-4 h-10 rounded-lg bg-muted" />
        <div className="mt-4 h-10 rounded-lg bg-muted" />
      </div>
    );
  }

  // 정원이 4명이어도 남은 자리가 2개면 2명까지만 고를 수 있어야 한다.
  // available 이 0 이하로 내려가면(막판 마감) 선택지가 없어야 하므로 0으로 바닥을 둔다.
  const maxSelectable = Math.max(0, Math.min(MAX_PARTY_SIZE, slot.available));

  if (maxSelectable === 0) {
    return (
      <div className="mx-auto w-full max-w-md text-center">
        <p role="alert" className="text-sm text-critical">
          아쉽게도 방금 마감되었습니다. 다른 시간을 선택해주세요.
        </p>
        <Link
          href={course ? `/courses/${course.id}` : "/"}
          className="mt-4 inline-block text-sm font-medium text-brand underline underline-offset-2"
        >
          시간 다시 선택하기
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <Link
        href={course ? `/courses/${course.id}` : "/"}
        className="text-sm text-muted-foreground transition hover:opacity-80"
      >
        ← 시간 다시 선택
      </Link>

      {/* 무엇을 예약하는지 다시 보여준다 */}
      <section className="mt-4 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold">{course.name}</h1>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
            {TYPE_LABEL[course.type]}
          </span>
        </div>

        <p className="mt-3 text-sm">
          {formatDateLabel(slot.date)} {formatTimeLabel(slot.time)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          1인 {slot.price.toLocaleString("ko-KR")}원 · {slot.available}자리 남음
        </p>
      </section>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">이름</span>
          <input
            type="text"
            required
            maxLength={NAME_MAX_LENGTH}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand"
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
            autoComplete="tel"
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <span className="text-xs text-muted-foreground">
            예약 조회할 때 예약번호와 함께 필요합니다.
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">인원</span>
          <select
            value={partySize}
            onChange={(e) => setPartySize(Number(e.target.value))}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand"
          >
            {Array.from({ length: maxSelectable }, (_, i) => i + 1).map((size) => (
              <option key={size} value={size}>
                {size}명
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">
            메모 <span className="text-muted-foreground">(선택)</span>
          </span>
          <textarea
            rows={3}
            maxLength={MEMO_MAX_LENGTH}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            className="resize-none rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <span className="text-right text-xs text-muted-foreground">
            {memo.length}/{MEMO_MAX_LENGTH}
          </span>
        </label>

        {submitError && (
          <p role="alert" className="text-sm text-critical">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          // 두 번 눌러 두 건이 잡히는 걸 막는다.
          disabled={isSubmitting}
          className="mt-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "예약하는 중…" : "예약하기"}
        </button>
      </form>
    </div>
  );
}

export default function BookPage() {
  return (
    <main className="flex-1 px-6 py-10">
      <Suspense fallback={null}>
        <BookForm />
      </Suspense>
    </main>
  );
}
