"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CancelBookingButton({ bookingCode }) {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState(null);

  async function handleCancel() {
    if (!window.confirm("이 예약을 취소하시겠어요? 취소한 예약은 복구할 수 없습니다.")) return;
    setIsCancelling(true);
    setError(null);

    try {
      const response = await fetch(`/api/bookings/${encodeURIComponent(bookingCode)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? "예약을 취소하지 못했습니다.");
        return;
      }
      router.refresh();
    } catch {
      setError("예약을 취소하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <div className="mt-3 flex flex-col items-start gap-2">
      <button type="button" onClick={handleCancel} disabled={isCancelling}
        className="rounded-lg border border-critical px-3 py-1.5 text-sm font-medium text-critical transition hover:bg-critical/10 disabled:cursor-not-allowed disabled:opacity-50">
        {isCancelling ? "취소 처리 중…" : "예약 취소"}
      </button>
      {error && <p role="alert" className="text-sm text-critical">{error}</p>}
    </div>
  );
}

