// Из самого файла будильников, а не через вход драйвера: вход тянет за собой
// транспорт и радио, а здесь считаются только биты маски.
import { EVERY_DAY, WEEKDAYS, WEEKEND, Weekday, type Alarm } from '../api/alarms';

/**
 * Будильники для экрана: как показать маску дней и время и как её править.
 *
 * Маска у устройства начинается с воскресенья, а неделя в приложении — с
 * понедельника. Порядок переставляется здесь, чтобы ни один экран не считал
 * биты сам: ошибка в одном бите — это будильник не в тот день, и человек
 * узнает о ней, когда проспит.
 */

export const DAYS = [
  { bit: Weekday.monday, short: 'Mon' },
  { bit: Weekday.tuesday, short: 'Tue' },
  { bit: Weekday.wednesday, short: 'Wed' },
  { bit: Weekday.thursday, short: 'Thu' },
  { bit: Weekday.friday, short: 'Fri' },
  { bit: Weekday.saturday, short: 'Sat' },
  { bit: Weekday.sunday, short: 'Sun' },
] as const;

export function hasDay(mask: number, bit: number): boolean {
  return (mask & bit) === bit;
}

export function toggleDay(mask: number, bit: number): number {
  return hasDay(mask, bit) ? mask & ~bit : mask | bit;
}

/**
 * Подпись под временем. Пустая маска — это «один раз»: устройство такой
 * будильник отработает на ближайшем совпадении времени и больше не повторит.
 */
export function daysText(mask: number): string {
  if (mask === 0) return 'Once';
  if (mask === EVERY_DAY) return 'Every day';
  if (mask === WEEKDAYS) return 'Weekdays';
  if (mask === WEEKEND) return 'Weekend';

  return DAYS.filter((day) => hasDay(mask, day.bit))
    .map((day) => day.short)
    .join(', ');
}

/** Время двумя цифрами: 7:5 на будильнике читается как 7:05 не сразу. */
export function timeText(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** Разбор введённого времени. `null` — не время, а не «полночь». */
export function parseTime(input: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(input.trim());
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;

  return { hour, minute };
}

/** Метка длиннее двадцати символов на устройство не поместится — режем здесь, а не там. */
export const LABEL_LIMIT = 20;

/**
 * Свободен ли слот. Устройство отдаёт весь список ячеек, включая пустые:
 * выключенный будильник на 00:00 без дней — это и есть пустая ячейка.
 */
export function isEmpty(alarm: Alarm): boolean {
  return !alarm.enabled && alarm.hour === 0 && alarm.minute === 0 && alarm.days === 0;
}

/** Что показывать человеку: пустые ячейки — не будильники. */
export function realAlarms(list: readonly Alarm[]): Alarm[] {
  return list.filter((alarm) => !isEmpty(alarm));
}
