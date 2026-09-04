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
