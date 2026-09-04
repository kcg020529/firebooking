import { useEffect, useState } from "react";

/**
 * courseId·date 로 코스를 다시 조회해 slotId 에 해당하는 슬롯을 찾는다.
 *
 * slotId 하나로 슬롯을 조회하는 API 가 아직 없어서, 상세 화면이 쿼리스트링으로
 * 넘겨준 courseId·date 로 같은 API 를 다시 부른다. 예약 폼과 예약 완료 화면이
 * 똑같은 조회를 하고 있어서 한 곳에 모았다 — 나중에 슬롯 전용 API 가 생기면
 * 이 함수만 바꾸면 두 화면이 같이 따라온다.
 *
 * @param {{ courseId: string|null, date: string|null, slotId: string|null }} params
 */
export function useSlot({ courseId, date, slotId }) {
  const [course, setCourse] = useState(null);
  const [slot, setSlot] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!courseId || !date || !slotId) return;

    let isStale = false;

    async function fetchSlot() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/courses/${courseId}?date=${date}`);
        const data = await res.json();

        if (isStale) return;

        if (!data.ok) {
          setError(data.error);
          return;
        }

        const found = data.course.slots.find((s) => s.id === slotId);
        if (!found) {
          setError("선택하신 시간을 찾을 수 없습니다. 목록에서 다시 선택해주세요.");
          return;
        }

        setCourse(data.course);
        setSlot(found);
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
  }, [courseId, date, slotId]);

  return { course, slot, isLoading, error };
}
