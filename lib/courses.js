import { createServerClient } from './supabase.js';

/**
 * DB(snake_case) → JS·API(camelCase) 변환.
 *
 * CLAUDE.md 절대 규칙 6: 변환은 여기 한 곳에서만 한다.
 * 컴포넌트나 페이지에서 image_url 을 보게 되면 그건 버그다.
 */
function toCourse(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    region: row.region,
    address: row.address,
    phone: row.phone,
    imageUrl: row.image_url,
    description: row.description,
  };
}

function toSlot(row) {
  return {
    id: row.id,
    date: row.date,
    time: row.time,
    price: row.price,
    capacity: row.capacity,
    booked: row.booked,
    available: row.capacity - row.booked,
  };
}

/**
 * 골프장 목록.
 * @param {{ type?: 'field' | 'screen' }} options
 */
export async function listCourses({ type } = {}) {
  const supabase = createServerClient();

  let query = supabase
    .from('courses')
    .select('id, name, type, region, address, phone, image_url, description')
    .order('name', { ascending: true });

  if (type) {
    query = query.eq('type', type);
  }

  const { data, error } = await query;
  if (error) throw error;

  return data.map(toCourse);
}

/**
 * 골프장 상세 + 특정 날짜의 예약 가능 슬롯.
 *
 * date 를 넘기지 않으면 슬롯은 빈 배열로 돌려준다.
 * 14일치를 통째로 내려보내면 응답이 불필요하게 커진다.
 *
 * @param {string} id
 * @param {{ date?: string }} options  date 는 'YYYY-MM-DD'
 */
export async function getCourse(id, { date } = {}) {
  const supabase = createServerClient();

  const { data: course, error } = await supabase
    .from('courses')
    .select('id, name, type, region, address, phone, image_url, description')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!course) return null;

  let slots = [];
  if (date) {
    const { data: slotRows, error: slotError } = await supabase
      .from('slots')
      .select('id, date, time, price, capacity, booked')
      .eq('course_id', id)
      .eq('date', date)
      .order('time', { ascending: true });

    if (slotError) throw slotError;
    slots = slotRows.map(toSlot);
  }

  return { ...toCourse(course), slots };
}
