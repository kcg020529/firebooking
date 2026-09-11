import { createServerClient } from './supabase.js';
import { detectAndMaskPii } from './security/pii.js';

export const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'];
export const REVIEW_CONTENT_MAX_LENGTH = 1000;

const DIFFICULTY_LABELS = { easy: '쉬움', medium: '보통', hard: '어려움' };

export function validateReviewInput(input) {
  const rating = Number(input?.rating);
  const difficulty = input?.difficulty;
  const content = typeof input?.content === 'string' ? input.content.trim() : '';

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: '별점은 1점에서 5점 사이여야 합니다.' };
  }
  if (!DIFFICULTY_LEVELS.includes(difficulty)) {
    return { ok: false, error: '난이도 값이 올바르지 않습니다.' };
  }
  if (!content || content.length > REVIEW_CONTENT_MAX_LENGTH) {
    return { ok: false, error: `리뷰는 1자 이상 ${REVIEW_CONTENT_MAX_LENGTH}자 이하로 입력해 주세요.` };
  }

  return { ok: true, value: { rating, difficulty, content } };
}

export function summarizeReviews(rows = []) {
  const difficultyCounts = Object.fromEntries(DIFFICULTY_LEVELS.map((level) => [level, 0]));
  let ratingTotal = 0;

  for (const row of rows) {
    ratingTotal += row.rating;
    if (difficultyCounts[row.difficulty] !== undefined) difficultyCounts[row.difficulty] += 1;
  }

  const count = rows.length;
  const difficulty = DIFFICULTY_LEVELS.reduce(
    (best, level) => (difficultyCounts[level] > difficultyCounts[best] ? level : best),
    'easy',
  );

  return {
    count,
    averageRating: count ? Math.round((ratingTotal / count) * 10) / 10 : 0,
    difficulty: count ? difficulty : null,
    difficultyCounts,
  };
}

function toReview(row) {
  return {
    id: row.id,
    rating: row.rating,
    difficulty: row.difficulty,
    difficultyLabel: DIFFICULTY_LABELS[row.difficulty] ?? row.difficulty,
    content: row.content,
    createdAt: row.created_at,
  };
}

export async function listCourseReviews(courseId, { client = createServerClient() } = {}) {
  const { data, error } = await client
    .from('course_reviews')
    .select('id, rating, difficulty, content, created_at')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  const reviews = (data ?? []).map(toReview);
  return { reviews, summary: summarizeReviews(reviews) };
}

export async function canReviewCourse(courseId, userId, { client = createServerClient() } = {}) {
  if (!courseId || !userId) return false;

  const { data, error } = await client
    .from('bookings')
    .select('id, slots!inner(course_id)')
    .eq('user_id', userId)
    .eq('slots.course_id', courseId)
    .limit(1);

  if (error) throw error;
  return (data ?? []).length > 0;
}

export async function createCourseReview(
  { courseId, userId, rating, difficulty, content },
  { client = createServerClient() } = {},
) {
  const validated = validateReviewInput({ rating, difficulty, content });
  if (!validated.ok) return validated;

  if (!(await canReviewCourse(courseId, userId, { client }))) {
    return { ok: false, error: '해당 골프장에 예약한 사용자만 리뷰를 작성할 수 있습니다.' };
  }

  const maskedContent = detectAndMaskPii(validated.value.content).maskedText;
  const { data, error } = await client
    .from('course_reviews')
    .insert({
      course_id: courseId,
      user_id: userId,
      rating: validated.value.rating,
      difficulty: validated.value.difficulty,
      content: maskedContent,
    })
    .select('id, rating, difficulty, content, created_at')
    .single();

  if (error) {
    if (error.code === '23505') return { ok: false, error: '이미 이 골프장에 리뷰를 작성했습니다.' };
    throw error;
  }
  return { ok: true, review: toReview(data) };
}

