"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { formatDateLabel, formatTimeLabel } from "@/lib/dateLabel";
import { TYPE_LABEL } from "@/lib/courseType";
import { useSlot } from "@/lib/useSlot";

/** 복사했다는 표시를 띄워두는 시간(ms). */
const COPIED_NOTICE_MS = 2000;

function BookingComplete() {
  const { code } = useParams();
  const searchParams = useSearchParams();

  // 무엇을 예약했는지 다시 보여주기 위한 값. 예약 폼이 넘겨준다.
  // ★ 이름·전화번호는 넘기지 않는다 — URL 은 브라우저 기록과 Referer 헤더에 남는다.
  const slotId = searchParams.get("slotId");

  const [isCopied, setIsCopied] = useState(false);

  // 예약 내용은 예약번호만으로 조회하지 않는다. 조회 API 가 전화번호를 함께
  // 요구하는 이유(예약번호 대입으로 남의 예약을 긁는 것)를 여기서 우회하면 안 된다.
  // 여기서는 방금 예약한 사람이 들고 온 slotId 로 슬롯을 다시 읽을 뿐이다.
  // 요약을 못 불러와도 예약번호는 보여줘야 하므로 로딩·에러는 쓰지 않는다.
  const { course, slot } = useSlot(slotId);


  useEffect(() => {
    if (!isCopied) return;

    const timer = setTimeout(() => setIsCopied(false), COPIED_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [isCopied]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
    } catch {
      // 클립보드를 막아둔 브라우저도 있다. 번호는 화면에 그대로 보이니 실패해도 괜찮다.
    }
  }

  return (
    <div className="mx-auto w-full max-w-md text-center">
      <p className="text-4xl" aria-hidden="true">
        ⛳
      </p>
      <h1 className="mt-4 text-2xl font-bold">예약이 완료되었습니다</h1>

      <section className="mt-8 rounded-xl border border-border bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">예약번호</p>
        <p className="mt-2 font-mono text-3xl font-bold tracking-widest">{code}</p>

        <button
          type="button"
          onClick={handleCopy}
          className="mt-4 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:opacity-80"
        >
          {isCopied ? "복사했습니다" : "예약번호 복사"}
        </button>

        {/* 슬롯 요약은 못 불러올 수도 있다. 예약번호만으로도 화면이 성립해야 한다. */}
        {course && slot && (
          <div className="mt-6 border-t border-border pt-6 text-sm">
            <p className="font-medium">
              {course.name}
              <span className="ml-2 rounded-full bg-muted px-2.5 py-0.5 text-xs font-normal text-muted-foreground">
                {TYPE_LABEL[course.type]}
              </span>
            </p>
            <p className="mt-2 text-muted-foreground">
              {formatDateLabel(slot.date)} {formatTimeLabel(slot.time)}
            </p>
          </div>
        )}
      </section>

      <p className="mt-6 text-sm text-muted-foreground">
        예약번호를 따로 적어두세요.{" "}
        <Link href="/lookup" className="font-medium text-brand underline underline-offset-2">
          예약 조회
        </Link>
        에서 <strong className="font-medium">예약번호와 전화번호</strong>로 다시 확인할 수
        있습니다.
      </p>

      <Link
        href="/"
        className="mt-8 inline-block rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground transition hover:opacity-90"
      >
        홈으로
      </Link>
    </div>
  );
}

export default function BookingCompletePage() {
  return (
    <main className="flex-1 px-6 py-16">
      <Suspense fallback={null}>
        <BookingComplete />
      </Suspense>
    </main>
  );
}
