import { shortDay } from '@/shared/lib/day';

import type { Course, CourseDraft } from '../api/courses';

/**
 * Форма курса: имя и срок. Состав приёмов сервер ведёт расписанием по дням
 * недели через отдельные ручки; здесь только то, что принимает сам курс.
 * Экрана формы в макете нет — формулировки рабочие.
 */
export const COURSE_FORM = {
  name: { label: 'Course name', hint: 'Morning stack' },
  start: { label: 'Starts', hint: 'YYYY-MM-DD · optional' },
  end: { label: 'Ends', hint: 'YYYY-MM-DD · optional' },
  badDate: 'Dates are written as YYYY-MM-DD.',
  saveFailed: 'The course did not save. Try again.',
} as const;

export type CourseFields = { name: string; start: string; end: string };

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Черновик из полей или `null`, если дата написана не так. Пустое поле —
 * это отсутствие срока, а не ошибка: бессрочный курс тоже курс.
 */
export function courseDraftOf(fields: CourseFields): CourseDraft | null {
  const start = fields.start.trim();
  const end = fields.end.trim();
  if ((start && !DAY.test(start)) || (end && !DAY.test(end))) return null;

  return {
    name: fields.name.trim() || null,
    startDate: start || null,
    endDate: end || null,
  };
}

export function fieldsOf(course: Pick<Course, 'name' | 'startDate' | 'endDate'>): CourseFields {
  return { name: course.name, start: course.startDate ?? '', end: course.endDate ?? '' };
}

/** Срок курса словами. Бессрочный курс — тоже курс, и это надо сказать. */
export function coursePeriod(course: Pick<Course, 'startDate' | 'endDate'>): string {
  if (!course.startDate && !course.endDate) return 'no end date';
  if (course.startDate && course.endDate) {
    return `${shortDay(course.startDate)} — ${shortDay(course.endDate)}`;
  }
  return course.startDate
    ? `from ${shortDay(course.startDate)}`
    : `until ${shortDay(course.endDate ?? '')}`;
}
