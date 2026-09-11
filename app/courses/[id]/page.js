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

function ReviewCard({ review, onLike, onEdit, onDelete, editing, onSave, onCancel, onChange }) {
  return <article className="rounded-xl border border-border bg-card p-4"><div className="flex justify-between text-sm"><span>★ {review.rating} <button type="button" onClick={() => onLike(review.id)}>♡ {review.likeCount ?? 0}</button></span><span className="text-muted-foreground">난이도 {review.difficultyLabel}</span></div><p className="mt-2 text-sm">{review.content}</p>{(review.isOwner || review.canDelete) && <div className="mt-3 flex gap-2 text-xs">{review.isOwner && <button type="button" onClick={() => onEdit(review)}>수정</button>}<button type="button" onClick={() => onDelete(review.id)}>삭제</button></div>}{editing && <div className="mt-3 flex gap-2"><select value={editing.rating} onChange={(e) => onChange({ ...editing, rating: Number(e.target.value) })}>{[5,4,3,2,1].map((v) => <option key={v} value={v}>{v}점</option>)}</select><select value={editing.difficulty} onChange={(e) => onChange({ ...editing, difficulty: e.target.value })}><option value="easy">쉬움</option><option value="medium">보통</option><option value="hard">어려움</option></select><input value={editing.content} onChange={(e) => onChange({ ...editing, content: e.target.value })} /><button type="button" onClick={() => onSave(review.id)}>저장</button><button type="button" onClick={onCancel}>취소</button></div>}</article>;
}

export default function CourseDetailPage() {
  const { id } = useParams();

  const [dateOptions, setDateOptions] = useState([]);
  const [date, setDate] = useState("");
  const [course, setCourse] = useState(null);
  const [reviews, setReviews] = useState({ featured: [], items: [], summary: null, canReview: false, hasReviewed: false, page: 1, totalPages: 1 });
  const [reviewForm, setReviewForm] = useState({ rating: 5, difficulty: "medium", content: "" });
  const [reviewError, setReviewError] = useState(null);
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
  const [isReviewFormOpen, setIsReviewFormOpen] = useState(true);
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editingReview, setEditingReview] = useState({ rating: 5, difficulty: "medium", content: "" });
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

  useEffect(() => {
    let isStale = false;
    async function fetchReviews() {
      try {
        const response = await fetch(`/api/courses/${id}/reviews`);
        const data = await response.json();
        if (!isStale && data.ok) setReviews(data);
      } catch {
        // 리뷰 조회 실패는 예약 기능을 막지 않는다.
      }
    }
    fetchReviews();
    return () => { isStale = true; };
  }, [id]);

  async function handleReviewSubmit(event) {
    event.preventDefault();
    setReviewError(null);
    setIsReviewSubmitting(true);
    try {
      const response = await fetch(`/api/courses/${id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reviewForm),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setReviewError(data.error ?? "리뷰를 저장하지 못했습니다.");
        return;
      }
      const refreshed = await fetch(`/api/courses/${id}/reviews`).then((res) => res.json());
      if (refreshed.ok) setReviews(refreshed);
      setReviewForm((current) => ({ ...current, content: "" }));
      setIsReviewFormOpen(false);
    } catch {
      setReviewError("리뷰를 저장하지 못했습니다.");
    } finally {
      setIsReviewSubmitting(false);
    }
  }

  async function handleReviewUpdate(reviewId) {
    const response = await fetch(`/api/courses/${id}/reviews/${reviewId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editingReview) });
    const data = await response.json();
    if (!response.ok || !data.ok) { setReviewError(data.error ?? "리뷰를 수정하지 못했습니다."); return; }
    const refreshed = await fetch(`/api/courses/${id}/reviews?page=${reviews.page}`).then((res) => res.json());
    if (refreshed.ok) setReviews(refreshed);
    setEditingReviewId(null);
  }

  async function handleReviewDelete(reviewId) {
    if (!window.confirm("리뷰를 삭제할까요?")) return;
    const response = await fetch(`/api/courses/${id}/reviews/${reviewId}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok || !data.ok) { setReviewError(data.error ?? "리뷰를 삭제하지 못했습니다."); return; }
    const refreshed = await fetch(`/api/courses/${id}/reviews?page=${reviews.page}`).then((res) => res.json());
    if (refreshed.ok) setReviews(refreshed);
  }

  async function handleLike(reviewId) {
    const response = await fetch(`/api/courses/${id}/reviews/${reviewId}/like`, { method: "POST" });
    if (response.ok) { const refreshed = await fetch(`/api/courses/${id}/reviews?page=${reviews.page}`).then((res) => res.json()); if (refreshed.ok) setReviews(refreshed); }
  }

  const slots = course?.slots ?? [];

  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-5xl justify-end px-6 py-6">
        <Link
          href="/"
          className="text-sm text-muted-foreground transition hover:opacity-80"
        >
          ← 목록으로
        </Link>
      </div>

      {/* 골프장 정보 */}
      {course && (
        <section className="w-full px-6">
          <div className="mx-auto max-w-5xl">
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
          </div>
        </section>
      )}

      {/* 리뷰와 체감 난이도 */}
      <section className="w-full px-6 py-8">
        <div className="mx-auto max-w-5xl">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold">리뷰</h2>
          {reviews.summary?.count > 0 && (
            <p className="text-sm text-muted-foreground">
              ★ {reviews.summary.averageRating} ({reviews.summary.count}) · 체감 난이도
              <span className="ml-2 inline-flex gap-1" aria-label="체감 난이도">
                {["easy", "medium", "hard"].map((level, index) => <span key={level} className={`h-2 w-8 rounded ${index <= ["easy", "medium", "hard"].indexOf(reviews.summary.difficulty) ? "bg-brand" : "bg-muted"}`} />)}
              </span>
            </p>
          )}
        </div>

        {reviews.canReview && isReviewFormOpen && (
          <form onSubmit={handleReviewSubmit} className="mt-4 rounded-xl border border-border bg-card p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm"><span>별점</span><select value={reviewForm.rating} onChange={(e) => setReviewForm({ ...reviewForm, rating: Number(e.target.value) })} className="rounded-lg border border-border bg-background px-3 py-2">{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value}점</option>)}</select></label>
              <label className="flex flex-col gap-1 text-sm"><span>체감 난이도</span><select value={reviewForm.difficulty} onChange={(e) => setReviewForm({ ...reviewForm, difficulty: e.target.value })} className="rounded-lg border border-border bg-background px-3 py-2"><option value="easy">쉬움</option><option value="medium">보통</option><option value="hard">어려움</option></select></label>
            </div>
            <textarea required maxLength={1000} value={reviewForm.content} onChange={(e) => setReviewForm({ ...reviewForm, content: e.target.value })} placeholder="골프장 이용 후기를 남겨주세요." className="mt-3 min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            {reviewError && <p role="alert" className="mt-2 text-sm text-critical">{reviewError}</p>}
            <button type="submit" disabled={isReviewSubmitting} className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50">{isReviewSubmitting ? "저장 중…" : "리뷰 등록"}</button>
          </form>
        )}

      {!reviews.canReview && <p className="mt-3 text-sm text-muted-foreground">{reviews.hasReviewed ? "이미 이 골프장에 리뷰를 작성했습니다." : "예약을 완료한 로그인 사용자만 리뷰를 작성할 수 있습니다."}</p>}
        {(reviews.featured ?? []).length > 0 && <><h3 className="mt-5 text-sm font-semibold">인기 리뷰</h3><div className="mt-2 space-y-3">{reviews.featured.map((review) => <ReviewCard key={`featured-${review.id}`} review={review} onLike={handleLike} onEdit={(item) => { setEditingReviewId(item.id); setEditingReview({ rating: item.rating, difficulty: item.difficulty, content: item.content }); }} onDelete={handleReviewDelete} editing={editingReviewId === review.id ? editingReview : null} onSave={handleReviewUpdate} onCancel={() => setEditingReviewId(null)} onChange={setEditingReview} />)}</div></>}
        </div>
      </section>

      {/* 날짜 선택 */}
      <section className="w-full px-6 pt-8"><div className="mx-auto max-w-5xl">
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
      </div></section>

      {/* 시간 슬롯 */}
      <section className="w-full px-6 py-8"><div className="mx-auto max-w-5xl">
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
                  // slotId 만으로 슬롯 상세와 코스 요약을 조회할 수 있으므로 slotId 만 넘긴다.
                  href={`/book/${slot.id}`}
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
      </div></section>
      <section className="w-full px-6 pb-8"><div className="mx-auto max-w-5xl">
        <h2 className="text-lg font-semibold">전체 리뷰</h2>
        <div className="mt-4 space-y-3">{(reviews.items ?? []).map((review) => <ReviewCard key={review.id} review={review} onLike={handleLike} onEdit={(item) => { setEditingReviewId(item.id); setEditingReview({ rating: item.rating, difficulty: item.difficulty, content: item.content }); }} onDelete={handleReviewDelete} editing={editingReviewId === review.id ? editingReview : null} onSave={handleReviewUpdate} onCancel={() => setEditingReviewId(null)} onChange={setEditingReview} />)}</div>
        {(reviews.totalPages ?? 1) > 1 && <div className="mt-4 flex justify-center gap-2">{Array.from({ length: reviews.totalPages }, (_, index) => index + 1).map((page) => <button key={page} type="button" onClick={() => fetch(`/api/courses/${id}/reviews?page=${page}`).then((res) => res.json()).then((data) => data.ok && setReviews(data))} className={`rounded px-3 py-1 text-sm ${page === reviews.page ? "bg-brand text-brand-foreground" : "bg-muted"}`}>{page}</button>)}</div>}
      </div></section>
    </main>
  );
}
