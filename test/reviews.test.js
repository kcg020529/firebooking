import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canReviewCourse,
  createCourseReview,
  DIFFICULTY_LEVELS,
  summarizeReviews,
  getFeaturedReviews,
  splitFeaturedReviews,
  paginateReviews,
  sanitizeReviewContent,
  validateReviewInput,
} from '../lib/reviews.js';

function createClient({ bookings = [], inserted = null } = {}) {
  const calls = [];
  return {
    calls,
    from(table) {
      const state = { table, filters: [] };
      const builder = {
        select() { return builder; },
        eq(column, value) { state.filters.push([column, value]); return builder; },
        limit() { return Promise.resolve({ data: bookings, error: null }); },
        order() { return Promise.resolve({ data: [], error: null }); },
        insert(row) { calls.push({ table, row }); return builder; },
        single() { return Promise.resolve({ data: inserted, error: null }); },
      };
      return builder;
    },
  };
}

test('리뷰 입력은 별점·난이도·내용을 검증한다', () => {
  assert.deepEqual(validateReviewInput({ rating: 5, difficulty: 'hard', content: '좋아요' }), {
    ok: true,
    value: { rating: 5, difficulty: 'hard', content: '좋아요' },
  });
  assert.equal(validateReviewInput({ rating: 6, difficulty: 'easy', content: 'x' }).ok, false);
  assert.equal(validateReviewInput({ rating: 5, difficulty: 'unknown', content: 'x' }).ok, false);
  assert.equal(validateReviewInput({ rating: 5, difficulty: 'easy', content: '' }).ok, false);
  assert.deepEqual(DIFFICULTY_LEVELS, ['easy', 'medium', 'hard']);
});

test('리뷰 목록에서 평균 별점과 대표 난이도를 계산한다', () => {
  const summary = summarizeReviews([
    { rating: 5, difficulty: 'hard' },
    { rating: 4, difficulty: 'hard' },
    { rating: 3, difficulty: 'medium' },
  ]);

  assert.deepEqual(summary, {
    count: 3,
    averageRating: 4,
    difficulty: 'hard',
    difficultyCounts: { easy: 0, medium: 1, hard: 2 },
  });
});

test('예약 이력이 있는 사용자만 리뷰를 작성할 수 있다', async () => {
  const client = createClient({ bookings: [{ id: 'booking-1' }] });
  assert.equal(await canReviewCourse('course-1', 'user-1', { client }), true);
  assert.equal(await canReviewCourse('course-1', 'user-2', { client: createClient() }), false);
});

test('리뷰 저장 전에 내용의 개인정보를 마스킹한다', async () => {
  const client = createClient({
    bookings: [{ id: 'booking-1' }],
    inserted: { id: 'review-1', rating: 4, difficulty: 'medium', content: '연락처 010-****-5678', created_at: '2026-09-11T00:00:00Z' },
  });
  const result = await createCourseReview({
    courseId: 'course-1', userId: 'user-1', rating: 4, difficulty: 'medium', content: '연락처 010-1234-5678',
  }, { client });
  assert.equal(result.ok, true);
  assert.equal(client.calls[0].row.content.includes('010-1234-5678'), false);
});

test('리뷰 전용 마스킹은 PII만 가리고 일반 문장은 유지한다', () => {
  const result = sanitizeReviewContent('코스가 정말 좋았고 연락처는 010-1234-5678입니다.');
  assert.equal(result.maskedText.includes('010-1234-5678'), false);
  assert.equal(result.maskedText.includes('코스가 정말 좋았고'), true);
  assert.equal(sanitizeReviewContent('어려워요').maskedText, '어려워요');
});

test('좋아요 순으로 상위 3개와 나머지 페이지를 나눈다', () => {
  const rows = Array.from({ length: 5 }, (_, index) => ({ id: String(index), likeCount: 5 - index }));
  assert.deepEqual(getFeaturedReviews(rows).map((row) => row.id), ['0']);
  assert.deepEqual(paginateReviews(rows.slice(3), 1, 2).items.map((row) => row.id), ['3', '4']);
  assert.deepEqual(splitFeaturedReviews(rows).rest.map((row) => row.id), ['1', '2', '3', '4']);
});
