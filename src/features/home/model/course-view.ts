import type { Course, CourseSlot } from '../api/courses';

/**
 * Чтение курса приёма. Расписание приходит плоским списком строк на каждый
 * день недели — на экране его читают по дням, а внутри дня по времени.
 */
const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/**
 * Сервер нумерует дни с воскресенья (0), как это принято в JavaScript, а
 * неделя у человека начинается с понедельника. Порядок показа считаем этой
 * же функцией, иначе воскресенье уезжает в начало списка с подписью «Sun».
 */
export function weekdayOrder(dayOfWeek: number): number {
  return (dayOfWeek + 6) % 7;
}

export function weekdayName(dayOfWeek: number): string {
  return WEEK[weekdayOrder(dayOfWeek)] ?? '—';
}

export type CourseDay = { day: number; title: string; slots: CourseSlot[] };

export function byDay(course: Course | null): CourseDay[] {
  const days = new Map<number, CourseSlot[]>();
  for (const slot of course?.schedule ?? []) {
    days.set(slot.dayOfWeek, [...(days.get(slot.dayOfWeek) ?? []), slot]);
  }
  return [...days.entries()]
    .sort((a, b) => weekdayOrder(a[0]) - weekdayOrder(b[0]))
    .map(([day, slots]) => ({
      day,
      title: weekdayName(day),
      slots: slots.sort((a, b) => a.sortOrder - b.sortOrder),
    }));
}

/** Что стоит в строке расписания: связка, один продукт или ничего. */
export function slotTitle(slot: CourseSlot): string {
  return slot.displayName ?? slot.bundleName ?? slot.timeLabel;
}

/** Идёт ли курс сейчас. Даты необязательны — бессрочный курс тоже курс. */
export function isRunning(course: Course, today: string): boolean {
  if (!course.isActive) return false;
  if (course.startDate && today < course.startDate) return false;
  if (course.endDate && today > course.endDate) return false;
  return true;
}
