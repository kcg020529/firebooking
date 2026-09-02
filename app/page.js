"use client";

import { useState } from "react";
import { COURSES } from "../lib/mock/courses";

const TYPE_LABEL = { field: "필드", screen: "스크린" };

export default function Home() {
  const [type, setType] = useState("field");
  const filtered = COURSES.filter((c) => c.type === type);

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
        {filtered.map((course) => (
          <div key={course.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="mb-3 h-28 rounded-lg bg-muted" />
            <h3 className="font-semibold">{course.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{course.region}</p>
            <p className="mt-2 text-xs text-muted-foreground">{course.description}</p>
          </div>
        ))}
      </section>
    </main>
  );
}