import { createBooking, lookupBookings } from "../bookings.js";
import { getCourse, listCourses } from "../courses.js";

function toCourseSummary(course) {
  return {
    courseId: course.id,
    courseName: course.name,
    type: course.type,
    region: course.region,
  };
}

function toSearchSlot(course, slot) {
  return {
    id: slot.id,
    courseId: course.id,
    courseName: course.name,
    type: course.type,
    region: course.region,
    date: slot.date,
    time: slot.time,
    price: slot.price,
    capacity: slot.capacity,
    available: slot.available,
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeCourseName(value) {
  return typeof value === "string"
    ? value.toLocaleLowerCase("ko-KR").replace(/[\s._()-]/g, "")
    : "";
}

function findCourseByName(courses, value) {
  const target = normalizeCourseName(value);
  if (!target) return null;
  const exact = courses.find(({ name }) => normalizeCourseName(name) === target);
  if (exact) return exact;
  const partial = courses.filter(({ name }) => {
    const candidate = normalizeCourseName(name);
    return candidate.includes(target) || target.includes(candidate);
  });
  return partial.length === 1 ? partial[0] : null;
}

export function createChatToolDependencies({
  listCoursesFn = listCourses,
  getCourseFn = getCourse,
  createBookingFn = createBooking,
  lookupBookingFn = lookupBookings,
  onBookingResult = null,
  onLookupResult = null,
} = {}) {
  async function searchSlots({ type, courseId, courseName, date, partySize = 1 }) {
    let courses;

    if (courseId && UUID_RE.test(courseId)) {
      const course = await getCourseFn(courseId, { date });
      courses = course && (!type || course.type === type) ? [course] : [];
    } else if (courseName || courseId) {
      const summaries = await listCoursesFn({ type });
      const summary = findCourseByName(summaries, courseName || courseId);
      const course = summary ? await getCourseFn(summary.id, { date }) : null;
      courses = course && (!type || course.type === type) ? [course] : [];
    } else {
      const summaries = await listCoursesFn({ type });

      if (!date) {
        return {
          courses: summaries.map(toCourseSummary),
          slots: [],
        };
      }

      courses = (
        await Promise.all(
          summaries.map((course) => getCourseFn(course.id, { date })),
        )
      ).filter(Boolean);
    }

    return {
      courses: courses.map(toCourseSummary),
      slots: courses.flatMap((course) =>
        course.slots
          .filter((slot) => slot.available >= partySize)
          .map((slot) => toSearchSlot(course, slot)),
      ),
    };
  }

  async function createChatBooking(input) {
    const result = await createBookingFn(input);

    if (typeof onBookingResult === "function") {
      try {
        await onBookingResult({ input, result });
      } catch {
        console.error("[chatTool] 예약 감사 기록 실패");
      }
    }

    return result;
  }

  async function lookupChatBooking(input) {
    const result = await lookupBookingFn(input);

    if (typeof onLookupResult === "function") {
      try {
        await onLookupResult({ input, result });
      } catch {
        console.error("[chatTool] 예약 조회 감사 기록 실패");
      }
    }

    return result;
  }

  return {
    searchSlots,
    createBooking: createChatBooking,
    lookupBooking: lookupChatBooking,
  };
}
