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
