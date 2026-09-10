import { courseDraftOf, coursePeriod } from './course';

describe('courseDraftOf', () => {
  it('пустые даты — бессрочный курс, а не ошибка', () => {
    expect(courseDraftOf({ name: ' Morning stack ', start: '', end: '' })).toEqual({
      name: 'Morning stack',
      startDate: null,
      endDate: null,
    });
  });

  it('дата не по форме или не из календаря — черновика нет', () => {
    expect(courseDraftOf({ name: 'x', start: '12.09.2026', end: '' })).toBeNull();
    expect(courseDraftOf({ name: 'x', start: '2026-02-31', end: '' })).toBeNull();
    expect(courseDraftOf({ name: 'x', start: '', end: '2026-13-01' })).toBeNull();
  });

  it('пустое имя уезжает как отсутствие имени', () => {
    expect(courseDraftOf({ name: '  ', start: '2026-09-12', end: '2026-10-12' })).toEqual({
      name: null,
      startDate: '2026-09-12',
      endDate: '2026-10-12',
    });
  });
});

describe('coursePeriod', () => {
  it('называет срок в зависимости от того, какие даты есть', () => {
    expect(coursePeriod({ startDate: null, endDate: null })).toBe('no end date');
    expect(coursePeriod({ startDate: '2026-09-01', endDate: null })).toBe('from Sep 1');
    expect(coursePeriod({ startDate: null, endDate: '2026-09-30' })).toBe('until Sep 30');
    expect(coursePeriod({ startDate: '2026-09-01', endDate: '2026-09-30' })).toBe('Sep 1 — Sep 30');
  });
});
