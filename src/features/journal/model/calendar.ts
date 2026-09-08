import { to } from '@/shared/nav';

import type { CalendarEvent } from '../api/contract';

/** Сколько дней показывает агенда. */
export const AGENDA_DAYS = 7;

/**
 * Счёт дней и раскладка событий по дням. Это вычисления, а не вёрстка:
 * экран остаётся композицией, а тут появляется место для теста.
 */
export function quickAddHref(id: string) {
  if (id === 'workout') return to.workout('new');
  if (id === 'meal') return to.meal('new');
  if (id === 'stack') return to.course('all');
  return to.checkIn();
}

/** Первый день месяца по календарю: понедельник — 1, воскресенье — 7. */
export function firstWeekday(date: string): number {
  const [year, month] = date.split('-').map(Number);
  const at = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, 1));
  return ((at.getUTCDay() + 6) % 7) + 1;
}

export function agendaEnd(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const at = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  at.setUTCDate(at.getUTCDate() + AGENDA_DAYS - 1);
  return at.toISOString().slice(0, 10);
}

/** События приходят одним списком — в агенде их читают по дням. */
export function groupByDate(events: readonly CalendarEvent[]) {
  const byDate = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const list = byDate.get(event.date) ?? [];
    list.push(event);
    byDate.set(event.date, list);
  }
  return [...byDate.entries()].map(([date, list]) => ({ date, events: list }));
}
