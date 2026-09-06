import type { CalendarDay } from '@/shared/ui';

/** Июль 2026 начинается со среды — третий день недели, считая с понедельника. */
export const JULY_FIRST_WEEKDAY = 2;

const DOTS: Record<number, CalendarDay['dots']> = {
  1: ['success', 'highlight'],
  2: ['success', 'highlight', 'danger'],
  3: ['warning'],
  4: ['success'],
  5: ['success', 'highlight'],
  6: ['success', 'highlight', 'danger'],
  7: ['warning'],
  8: ['success'],
  9: ['success', 'highlight'],
  10: ['success', 'highlight', 'danger'],
  11: ['warning'],
  12: ['success'],
  13: ['success', 'highlight'],
  14: ['success', 'highlight'],
  16: ['success'],
  17: ['success', 'highlight'],
  19: ['success'],
  20: ['success', 'highlight'],
  22: ['success'],
  23: ['success', 'highlight'],
  25: ['success'],
  26: ['success', 'highlight'],
  28: ['success'],
  29: ['success', 'highlight'],
  31: ['success'],
};

/** Дни без отметок: за них ничего не записано — журнал показывает пустой день. */
export function hasMarks(day: number): boolean {
  return (DOTS[day]?.length ?? 0) > 0;
}

export const JULY = Array.from({ length: 31 }, (_, index) => ({
  day: index + 1,
  dots: DOTS[index + 1],
}));

/** День выбран в календаре — его записи. Порядок и содержимое из макета. */
export const DAY_ENTRIES = [
  { id: 'morning', title: 'Morning stack', subtitle: 'taken 08:00', done: true },
  { id: 'visit', title: 'Video visit · Anna Smirnova', subtitle: '15:30 · done', done: true },
  { id: 'day', title: 'Day stack', subtitle: '14:00', done: false },
  {
    id: 'intervals',
    title: 'Intervals · 5 × 3 min',
    subtitle: '18:30 · flagged by a decision',
    done: false,
  },
  { id: 'checkin', title: 'Evening check-in', subtitle: 'after 18:00', done: false },
] as const;

export const DAY_PROTOCOL = {
  title: 'Lipid correction',
  progressLabel: 'day 26 of 30',
  value: 26 / 30,
  streak: 'streak: 29 evenings in a row',
};

/** Агенда — те же записи, сгруппированные по дням. */
export const AGENDA = [
  { id: 'today', title: 'Today · July 13', entries: DAY_ENTRIES },
  {
    id: 'tomorrow',
    title: 'Tomorrow · July 14',
    entries: [
      { id: 'morning-2', title: 'Morning stack', subtitle: '08:00', done: false },
      { id: 'labs', title: 'Lab draw · lipids', subtitle: '09:30 · fasting', done: false },
      { id: 'walk', title: 'Walk · 40 min', subtitle: 'after lunch', done: false },
    ],
  },
] as const;

/** Слои журнала: что показывать на календаре и в агенде. Состав из макета. */
export const JOURNAL_LAYERS = [
  {
    id: 'protocols',
    tone: 'success',
    title: 'Protocols and courses',
    subtitle: '26 marks this month',
    on: true,
  },
  { id: 'supplements', tone: 'accent', title: 'Supplements', subtitle: '3 stacks a day', on: true },
  {
    id: 'workouts',
    tone: 'highlight',
    title: 'Workouts',
    subtitle: 'from Whoop and manual',
    on: true,
  },
  { id: 'visits', tone: 'warning', title: 'Visits and labs', subtitle: '2 in July', on: true },
  {
    id: 'checkins',
    tone: 'neutral',
    title: 'Evening check-ins',
    subtitle: '29-day streak',
    on: false,
  },
] as const;

/** Пустой день: что предлагаем добавить, когда за день ничего не записано. */
export const EMPTY_DAY = {
  title: 'Nothing logged this day',
  text: 'An empty day is a fact too — but if something was there, add it now while you remember.',
  quick: [
    { id: 'workout', icon: 'activity', title: 'A workout', subtitle: 'the band missed it' },
    { id: 'meal', icon: 'coffee', title: 'A meal', subtitle: 'photo or search' },
    { id: 'stack', icon: 'package', title: 'A stack', subtitle: 'morning, day or evening' },
    { id: 'note', icon: 'edit-3', title: 'A note', subtitle: 'voice or text' },
  ],
} as const;
