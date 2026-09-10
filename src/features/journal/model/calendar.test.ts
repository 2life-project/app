import type { JournalEvent } from '@/shared/domain';

import { agendaEnd, firstWeekday, groupByDate } from './calendar';

describe('firstWeekday', () => {
  it('понедельник — 1, воскресенье — 7', () => {
    // 1 июня 2026 — понедельник, 1 марта 2026 — воскресенье.
    expect(firstWeekday('2026-06-01')).toBe(1);
    expect(firstWeekday('2026-03-01')).toBe(7);
  });
});

describe('agendaEnd', () => {
  it('семь дней считая сегодняшний', () => {
    expect(agendaEnd('2026-09-08')).toBe('2026-09-14');
  });

  it('переход через конец месяца', () => {
    expect(agendaEnd('2026-09-28')).toBe('2026-10-04');
  });
});

describe('groupByDate', () => {
  const event = (date: string, id: string) => ({ date, id }) as JournalEvent;

  it('события собираются по дням в порядке появления', () => {
    const groups = groupByDate([
      event('2026-09-08', 'a'),
      event('2026-09-09', 'b'),
      event('2026-09-08', 'c'),
    ]);
    expect(groups.map((g) => g.date)).toEqual(['2026-09-08', '2026-09-09']);
    expect(groups[0]?.events).toHaveLength(2);
  });

  it('пустой список даёт пустую агенду', () => {
    expect(groupByDate([])).toEqual([]);
  });
});
