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

export function createChatToolDependencies({
  listCoursesFn = listCourses,
  getCourseFn = getCourse,
  createBookingFn = createBooking,
  lookupBookingFn = lookupBookings,
  onBookingResult = null,
  onLookupResult = null,
} = {}) {
  async function searchSlots({ type, courseId, date, partySize = 1 }) {
    let courses;

    if (courseId) {
      const course = await getCourseFn(courseId, { date });
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
