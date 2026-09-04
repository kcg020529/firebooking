import { useEffect, useState } from "react";

/**
 * slotId 로 슬롯과 해당 골프장 정보를 조회한다.
 *
 * GET /api/slots/:slotId 를 호출해 슬롯 단건과 코스 요약을 가져온다.
 * 예약 폼(/book/[slotId])과 예약 완료(/booking/[code]) 화면이 이 훅을 쓴다.
 *
 * @param {string | { slotId?: string|null, courseId?: string|null, date?: string|null }} params
 */
export function useSlot(params) {
  const slotId = typeof params === "string" ? params : params?.slotId ?? null;

  const [course, setCourse] = useState(null);
  const [slot, setSlot] = useState(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(slotId));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slotId) return;


    let isStale = false;

    async function fetchSlot() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/slots/${encodeURIComponent(slotId)}`);
        const data = await res.json();

        if (isStale) return;

        if (!data.ok) {
          setError(data.error || "선택하신 시간을 찾을 수 없습니다. 목록에서 다시 선택해주세요.");
          return;
        }

        setSlot(data.slot);
        setCourse(data.course ?? data.slot?.course ?? null);
      } catch (err) {
        if (!isStale) {
          console.error("[useSlot] 슬롯 조회 실패:", err);
          setError("예약 정보를 불러오지 못했습니다.");
        }
      } finally {
        if (!isStale) setIsLoading(false);
      }
    }

    fetchSlot();

    return () => {
      isStale = true;
    };
  }, [slotId]);

  return { course, slot, isLoading, error };
}

