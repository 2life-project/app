import { useMemo } from 'react';

/**
 * Сервер считает сутки в часовом поясе, который присылает клиент, и отвечает
 * датой вида `YYYY-MM-DD`. Поэтому «сегодня» здесь — это день в поясе
 * устройства, а не `Date` в UTC: в Москве в 02:00 они разные, и запрос за
 * вчерашний день вернул бы вчерашнюю ленту.
 */

/**
 * День и пояс, за которые смотрим данные. Их спрашивают и Главная, и Тело, и
 * Журнал, поэтому счёт «сегодня» живёт здесь: разойдись он между разделами —
 * они показывали бы разные сутки одного и того же человека.
 */
export function useToday(): { date: string; timeZone: string } {
  const timeZone = useMemo(() => deviceTimeZone(), []);
  const date = useMemo(() => dayIn(timeZone), [timeZone]);
  return { date, timeZone };
}

export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

/**
 * Собираем дату по частям, а не форматированием целиком: порядок и разделители
 * зависят от локали устройства, а формат `YYYY-MM-DD` задан контрактом.
 */
export function dayIn(timeZone: string, moment: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(moment);

  const at = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${at('year')}-${at('month')}-${at('day')}`;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Даты разбираем строкой, а не через `new Date(строка)`: конструктор трактует
 * `2026-09-05` как полночь UTC и в минусовых поясах отдаёт предыдущий день.
 */
function partsOf(date: string): { year: number; month: number; day: number } | null {
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) return null;
  return { year, month, day };
}

/** `2026-09-05` → `Sep 5`. */
export function shortDay(date: string): string {
  const parts = partsOf(date);
  const month = parts && MONTHS[parts.month - 1];
  return month ? `${month.slice(0, 3)} ${parts.day}` : date;
}

/** `2026-09-05` → `September 5, 2026`. */
export function longDay(date: string): string {
  const parts = partsOf(date);
  const month = parts && MONTHS[parts.month - 1];
  return month ? `${month} ${parts.day}, ${parts.year}` : date;
}

/** `2026-09-05` → `Saturday`. Считаем в UTC: день недели от пояса не зависит. */
export function weekdayOf(date: string): string {
  const parts = partsOf(date);
  if (!parts) return '';
  const at = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  return WEEKDAYS[at.getUTCDay()] ?? '';
}

/**
 * День момента времени в поясе устройства. `toISOString()` даёт UTC, и
 * загруженное в 23:30 показывалось бы завтрашним числом.
 */
export function dayOf(at: number | string, timeZone = deviceTimeZone()): string {
  const date = new Date(at);
  return Number.isNaN(date.getTime()) ? '' : dayIn(timeZone, date);
}

/**
 * Момент времени со смещением пояса, а не в UTC: `2026-09-10T01:00:00+03:00`.
 *
 * Сервер кладёт запись в день по этой отметке. В UTC час ночи по Москве —
 * ещё вчера, и еда уезжала бы в чужие сутки относительно даты в адресе.
 */
export function isoWithOffset(at: Date): string {
  const pad = (value: number) => String(Math.abs(value)).padStart(2, '0');
  const offset = -at.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const local = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
  const time = `${pad(at.getHours())}:${pad(at.getMinutes())}:${pad(at.getSeconds())}`;
  return `${local}T${time}${sign}${pad(Math.trunc(offset / 60))}:${pad(offset % 60)}`;
}
