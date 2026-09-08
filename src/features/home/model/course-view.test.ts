import type { Course, CourseSlot } from '../api/courses';

import { byDay, isRunning, slotTitle, weekdayName } from './course-view';

const slot = (extra: Partial<CourseSlot>) => ({ sortOrder: 0, ...extra }) as CourseSlot;

describe('weekdayName', () => {
  it('нумерация с воскресенья, как в JavaScript', () => {
    expect(weekdayName(0)).toBe('Sun');
    expect(weekdayName(1)).toBe('Mon');
    expect(weekdayName(6)).toBe('Sat');
  });
});

describe('byDay', () => {
  it('строки собираются по дням и упорядочиваются внутри дня', () => {
    const course = {
      schedule: [
        slot({ dayOfWeek: 2, sortOrder: 1, timeLabel: 'вечер' }),
        slot({ dayOfWeek: 1, sortOrder: 0, timeLabel: 'утро' }),
        slot({ dayOfWeek: 2, sortOrder: 0, timeLabel: 'утро' }),
      ],
    } as unknown as Course;

    const days = byDay(course);
    expect(days.map((d) => d.title)).toEqual(['Mon', 'Tue']);
    expect(days[1]?.slots.map((s) => s.timeLabel)).toEqual(['утро', 'вечер']);
  });

  it('пустой курс даёт пустое расписание, а не падение', () => {
    expect(byDay(null)).toEqual([]);
  });
});

describe('slotTitle', () => {
  it('имя строки важнее имени связки, а его — время', () => {
    expect(slotTitle(slot({ displayName: 'Утренний стек' }))).toBe('Утренний стек');
    expect(slotTitle(slot({ bundleName: 'Связка' }))).toBe('Связка');
    expect(slotTitle(slot({ timeLabel: '08:00' }))).toBe('08:00');
  });
});

describe('isRunning', () => {
  const course = (extra: Partial<Course>) => ({ isActive: true, ...extra }) as Course;

  it('бессрочный активный курс идёт', () => {
    expect(isRunning(course({ startDate: null, endDate: null }), '2026-09-08')).toBe(true);
  });

  it('до старта и после конца — не идёт', () => {
    expect(isRunning(course({ startDate: '2026-10-01' }), '2026-09-08')).toBe(false);
    expect(isRunning(course({ endDate: '2026-09-01' }), '2026-09-08')).toBe(false);
  });

  it('выключенный курс не идёт даже внутри дат', () => {
    expect(isRunning(course({ isActive: false }), '2026-09-08')).toBe(false);
  });
});
