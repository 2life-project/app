import { request } from '@/core/http/client';

/** Ручки курсов приёма: список и один курс с расписанием. */

/**
 * Строка расписания курса. День недели числом, время — подписью: сервер
 * хранит «утро» и «08:00» одинаково, и переводить одно в другое не нам.
 */
export type CourseSlot = {
  id: string;
  courseId: string;
  dayOfWeek: number;
  bundleId: string | null;
  productId: string | null;
  productQuantity: number;
  timeLabel: string;
  timeHint: string | null;
  sortOrder: number;
  /** В списке курсов сервер добавляет к строке имя и число позиций. */
  displayName?: string;
  itemCount?: number;
  bundleName?: string | null;
};

export type Course = {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  schedule: readonly CourseSlot[];
};

export function fetchCourses(signal?: AbortSignal): Promise<Course[]> {
  return request<Course[]>('/api/courses', { signal });
}

export function fetchCourse(id: string, signal?: AbortSignal): Promise<Course> {
  return request<Course>(`/api/courses/${encodeURIComponent(id)}`, { signal });
}

/** Что у курса можно задать руками: имя и срок. Расписание — отдельные ручки. */
export type CourseDraft = {
  name: string | null;
  startDate: string | null;
  endDate: string | null;
};

export function createCourse(draft: CourseDraft): Promise<Course> {
  return request<Course>('/api/courses', { method: 'POST', body: draft });
}

/**
 * Частичная правка: отсутствующие поля сервер сохраняет как есть. Поэтому
 * выключить курс — это `{ isActive: false }`, без расписания и дат.
 * Ответ приходит без расписания — форма списка, не детали.
 */
export function updateCourse(
  id: string,
  patch: Partial<CourseDraft> & { isActive?: boolean },
): Promise<Omit<Course, 'schedule'>> {
  return request<Omit<Course, 'schedule'>>(`/api/courses/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: patch,
  });
}
