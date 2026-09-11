import type { PlanItem } from '../api/contract';

import { intakeRowsOf, planCounts, timeOf } from './plan';

const intake = (id: string, status: string, extra: Partial<PlanItem> = {}): PlanItem => ({
  id,
  kind: 'intake',
  status,
  startAt: null,
  expectedTime: 'morning',
  domain: 'supplements',
  source: 'course',
  href: `/supplements/${id}`,
  reference: { entryId: id, projected: false },
  action: {
    method: 'PUT',
    url: `/api/v2/supplements/checkins/${id}`,
    body: { status: 'taken', date: '2026-09-10' },
  },
  ...extra,
});

const task: PlanItem = {
  id: 'task-1',
  kind: 'task',
  status: 'planned',
  startAt: Date.UTC(2026, 8, 10, 6, 30),
  domain: 'loads',
  source: 'calendar',
  href: '/tasks/task-1',
  reference: { taskId: 'task-1' },
};

describe('intakeRowsOf', () => {
  // Отметить можно только приём: у остальных пунктов нет действия, и рисовать
  // им галочку значит обещать то, чего сервер не умеет.
  it('оставляет только пункты с действием', () => {
    const rows = intakeRowsOf([task, intake('a', 'planned')]);
    expect(rows.map((row) => row.id)).toEqual(['a']);
  });

  it('местная отметка сильнее статуса из ленты', () => {
    const rows = intakeRowsOf([intake('a', 'planned'), intake('b', 'done')], { a: true, b: false });
    expect(rows.map((row) => row.done)).toEqual([true, false]);
  });
});

describe('planCounts', () => {
  it('поправляет счёт на отметки, которых лента ещё не видела', () => {
    const plan = {
      items: [intake('a', 'planned'), intake('b', 'done')],
      done: 1,
      total: 2,
      errors: [],
    };

    expect(planCounts(plan, { a: true })).toEqual({ done: 2, total: 2 });
    expect(planCounts(plan, { b: false })).toEqual({ done: 0, total: 2 });
    expect(planCounts(plan, { b: true })).toEqual({ done: 1, total: 2 });
  });
});

describe('timeOf', () => {
  it('без точного времени берёт подпись сервера, а не выдумывает час', () => {
    expect(timeOf(intake('a', 'planned'))).toBe('morning');
    expect(timeOf(intake('a', 'planned', { expectedTime: null }))).toBe('any time');
  });

  it('точное время — часы и минуты', () => {
    const at = new Date(2026, 8, 10, 7, 5).getTime();
    expect(timeOf(intake('a', 'planned', { startAt: at }))).toBe('07:05');
  });
});
