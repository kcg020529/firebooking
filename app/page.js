"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const TYPE_LABEL = { field: "필드", screen: "스크린" };

export default function Home() {
  const [type, setType] = useState("field");
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 종류를 바꿀 때마다 서버에서 다시 가져온다.
  // 필터링을 클라이언트에서 하지 않는 이유: 골프장이 늘어나면 전부 내려받게 되고,
  // 서버 필터는 그대로 두면 /api/courses 호출이 api_logs 에 남아 모니터링 대상이 된다.
  useEffect(() => {
    let isStale = false;

    async function fetchCourses() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/courses?type=${type}`);
        const data = await res.json();

        if (isStale) return;

        if (!data.ok) {
          setError(data.error);
          setCourses([]);
          return;
        }

        setCourses(data.courses);
      } catch {
        if (!isStale) setError("골프장 목록을 불러오지 못했습니다.");
      } finally {
        if (!isStale) setIsLoading(false);
      }
    }

    fetchCourses();

    // 토글을 빠르게 두 번 누르면 먼저 보낸 응답이 나중에 도착할 수 있다.
    // 그 응답으로 화면을 덮어쓰지 않도록 무효 처리한다.
    return () => {
      isStale = true;
    };
  }, [type]);

  return (
    <main className="flex-1">
      {/* 히어로 */}
      <section className="bg-brand text-brand-foreground px-6 py-16 text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">골프, 지금 예약하세요</h1>
        <p className="mt-3 text-sm text-brand-foreground/80 sm:text-base">
          필드부터 스크린골프까지, firebooking에서 한 번에
        </p>
      </section>

      {/* 필드/스크린 토글 */}
      <div className="flex justify-center gap-2 border-b border-border px-6 py-4">
        {["field", "screen"].map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`rounded-full px-5 py-2 text-sm font-medium transition ${
              type === t
                ? "bg-brand text-brand-foreground"
                : "bg-muted text-muted-foreground hover:opacity-80"
            }`}
          >
            {TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      {/* 골프장 목록 */}
      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-6 py-8 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading &&
          // 뼈대를 먼저 보여줘야 목록이 나타날 때 화면이 덜컥 밀리지 않는다.
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="mb-3 h-28 rounded-lg bg-muted" />
              <div className="h-4 w-2/3 rounded bg-muted" />
              <div className="mt-2 h-3 w-1/3 rounded bg-muted" />
            </div>
          ))}

        {!isLoading &&
          courses.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              className="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:shadow-md"
            >
              {course.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={course.imageUrl}
                  alt={course.name}
                  className="h-28 w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="h-28 bg-muted" />
              )}

              <div className="p-4">
                <h3 className="font-semibold">{course.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{course.region}</p>
                <p className="mt-2 text-xs text-muted-foreground">{course.description}</p>
              </div>
            </Link>
          ))}
      </section>

      {error && (
        <p className="px-6 pb-8 text-center text-sm text-muted-foreground">{error}</p>
      )}

      {!isLoading && !error && courses.length === 0 && (
        <p className="px-6 pb-8 text-center text-sm text-muted-foreground">
          등록된 골프장이 없습니다.
        </p>
      )}
    </main>
  );
}
