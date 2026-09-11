import { longDay, shortDay } from '@/shared/lib/day';

import { DatePager } from './date-pager';

/** Что нужно разделу, чтобы листать дни: какой день сегодня и как сдвинуться. */
export type DayProps = { today: string; onShift: (days: number) => void };

/** Переключатель дня раздела: вперёд дальше сегодняшнего не ходит — там ещё ничего не измерено. */
export function DayPager({ date, today, onShift }: { date: string } & DayProps) {
  return (
    <DatePager
      label={date === today ? `Today · ${shortDay(date)}` : longDay(date)}
      onPrev={() => onShift(-1)}
      onNext={date < today ? () => onShift(1) : undefined}
    />
  );
}
