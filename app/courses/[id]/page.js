"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { TYPE_LABEL } from "@/lib/courseType";
import { WEEKDAY_LABEL } from "@/lib/dateLabel";

// 시드 슬롯은 오늘+1 ~ 오늘+14 에만 있다.
// 그 밖의 날짜는 무조건 빈 목록이라, 고를 수 있는 날짜 자체를 이 범위로 막는다.
const FIRST_BOOKABLE_DAY = 1;
const LAST_BOOKABLE_DAY = 14;

/**
 * Date → 'YYYY-MM-DD'.
 * toISOString() 은 UTC 로 바꾸면서 KST 기준 날짜를 하루 당겨버리므로 쓰지 않는다.
 */
function toDateValue(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function buildDateOptions() {
  const today = new Date();

  return Array.from(
    { length: LAST_BOOKABLE_DAY - FIRST_BOOKABLE_DAY + 1 },
    (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() + FIRST_BOOKABLE_DAY + i);

      return {
        value: toDateValue(date),
        month: date.getMonth() + 1,
        day: date.getDate(),
        weekday: WEEKDAY_LABEL[date.getDay()],
      };
    }
  );
}

export default function CourseDetailPage() {
  const { id } = useParams();

  const [dateOptions, setDateOptions] = useState([]);
  const [date, setDate] = useState("");
  const [course, setCourse] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 날짜 옵션은 마운트된 뒤 브라우저의 시계를 읽어 계산한다.
  // 서버(SSR, UTC)와 브라우저(KST)에서 각각 new Date() 를 부르면
  // 자정~오전 9시 사이엔 "오늘"이 하루 어긋나 하이드레이션이 깨진다.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const options = buildDateOptions();
    setDateOptions(options);
    setDate(options[0].value);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!date) return;

    let isStale = false;

    async function fetchCourse() {
      setIsLoading(true);
      setError(null);
      // 이전 코스/날짜의 결과가 로딩 중이나 실패 시에도 남아있지 않도록 먼저 비운다.
      setCourse(null);

      try {
        const res = await fetch(`/api/courses/${id}?date=${date}`);
        const data = await res.json();

        if (isStale) return;

        if (!data.ok) {
          setError(data.error);
          return;
        }

        setCourse(data.course);
      } catch {
        if (!isStale) setError("골프장 정보를 불러오지 못했습니다.");
      } finally {
        if (!isStale) setIsLoading(false);
      }
    }

    fetchCourse();

    // 날짜를 빠르게 여러 번 누르면 먼저 보낸 응답이 나중에 도착할 수 있다.
    // 그 응답으로 화면을 덮어쓰지 않도록 무효 처리한다.
    return () => {
      isStale = true;
    };
  }, [id, date]);

  const slots = course?.slots ?? [];

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-5xl px-6 py-6">
        <Link
          href="/"
          className="text-sm text-muted-foreground transition hover:opacity-80"
        >
          ← 목록으로
        </Link>
      </div>

      {/* 골프장 정보 */}
      {course && (
        <section className="mx-auto max-w-5xl px-6">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            {course.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={course.imageUrl}
                alt={course.name}
                className="h-56 w-full object-cover"
              />
            ) : (
              <div className="h-56 bg-muted" />
            )}

            <div className="p-6">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{course.name}</h1>
                <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                  {TYPE_LABEL[course.type]}
                </span>
              </div>

              <p className="mt-2 text-sm text-muted-foreground">{course.address}</p>
              <p className="mt-1 text-sm text-muted-foreground">{course.phone}</p>
              <p className="mt-4 text-sm">{course.description}</p>
            </div>
          </div>
        </section>
      )}

      {/* 날짜 선택 */}
      <section className="mx-auto max-w-5xl px-6 pt-8">
        <h2 className="text-lg font-semibold">날짜 선택</h2>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {dateOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setDate(option.value)}
              className={`shrink-0 rounded-xl border px-4 py-3 text-center transition ${
                date === option.value
                  ? "border-brand bg-brand text-brand-foreground"
                  : "border-border bg-card hover:opacity-80"
              }`}
            >
              <span className="block text-xs">
                {option.month}/{option.day}
              </span>
              <span className="mt-1 block text-sm font-medium">{option.weekday}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 시간 슬롯 */}
      <section className="mx-auto max-w-5xl px-6 py-8">
        <h2 className="text-lg font-semibold">시간 선택</h2>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {isLoading &&
            // 뼈대를 먼저 보여줘야 목록이 나타날 때 화면이 덜컥 밀리지 않는다.
            Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="h-5 w-1/2 rounded bg-muted" />
                <div className="mt-2 h-3 w-2/3 rounded bg-muted" />
                <div className="mt-2 h-3 w-1/3 rounded bg-muted" />
              </div>
            ))}

          {!isLoading &&
            slots.map((slot) =>
              slot.available > 0 ? (
                <Link
                  key={slot.id}
                  // /book 화면은 사용자가 뭘 예약하는지 다시 보여줘야 하는데
                  // slotId 만으로 슬롯을 조회하는 API 가 아직 없다.
                  // 상세에서 이미 가진 값을 쿼리스트링으로 넘겨 A 의 API 를 기다리지 않는다.
                  href={`/book/${slot.id}?courseId=${course.id}&date=${slot.date}`}
                  className="rounded-xl border border-border bg-card p-4 shadow-sm transition hover:shadow-md"
                >
                  <span className="block text-lg font-semibold">
                    {slot.time.slice(0, 5)}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {slot.price.toLocaleString("ko-KR")}원
                  </span>
                  <span className="mt-1 block text-xs text-brand">
                    {slot.available}자리 남음
                  </span>
                </Link>
              ) : (
                <div
                  key={slot.id}
                  aria-disabled="true"
                  className="cursor-not-allowed rounded-xl border border-border bg-muted p-4 text-muted-foreground"
                >
                  <span className="block text-lg font-semibold">
                    {slot.time.slice(0, 5)}
                  </span>
                  <span className="mt-1 block text-sm">
                    {slot.price.toLocaleString("ko-KR")}원
                  </span>
                  <span className="mt-1 block text-xs">마감</span>
                </div>
              )
            )}
        </div>

        {error && <p className="mt-4 text-sm text-muted-foreground">{error}</p>}

        {!isLoading && !error && slots.length === 0 && (
          <p className="mt-4 text-sm text-muted-foreground">
            선택하신 날짜에는 예약 가능한 시간이 없습니다.
          </p>
        )}
      </section>
    </main>
  );
}
