import {
  isoWithOffset,
  dayIn,
  dayOf,
  longDay,
  shortDay,
  weekdayOf,
  shiftDay,
  clockOf,
} from './day';

describe('день в часовом поясе', () => {
  // Полночь по Москве — это ещё вчера по UTC. Запрос за «сегодня» обязан
  // спрашивать день пользователя, иначе лента съезжает на сутки.
  it('берётся пояс, а не UTC', () => {
    const moment = new Date('2026-09-05T22:30:00.000Z');
    expect(dayIn('Europe/Moscow', moment)).toBe('2026-09-06');
    expect(dayIn('UTC', moment)).toBe('2026-09-05');
    expect(dayIn('America/Los_Angeles', moment)).toBe('2026-09-05');
  });

  it('формат всегда YYYY-MM-DD, независимо от локали устройства', () => {
    expect(dayIn('Europe/Moscow', new Date('2026-01-02T09:00:00.000Z'))).toBe('2026-01-02');
  });
});

describe('вид даты', () => {
  it('день разбирается из строки, без часового пояса', () => {
    expect(shortDay('2026-09-05')).toBe('Sep 5');
    expect(longDay('2026-09-05')).toBe('September 5, 2026');
    expect(weekdayOf('2026-09-05')).toBe('Saturday');
  });

  it('нераспознанная дата возвращается как есть, а не превращается в NaN', () => {
    expect(shortDay('')).toBe('');
    expect(weekdayOf('')).toBe('');
  });
});

describe('dayOf', () => {
  it('день считается в поясе устройства, а не в UTC', () => {
    // 8 сентября 23:30 в Москве — это 20:30 UTC того же дня, но 9 сентября
    // 00:30 в Токио: без пояса документ показался бы завтрашним.
    const at = Date.UTC(2026, 8, 8, 20, 30);
    expect(dayOf(at, 'Europe/Moscow')).toBe('2026-09-08');
    expect(dayOf(at, 'Asia/Tokyo')).toBe('2026-09-09');
  });

  it('битый момент времени не роняет разбор', () => {
    expect(dayOf('не дата', 'Europe/Moscow')).toBe('');
  });
});

describe('isoWithOffset', () => {
  it('пишет местное время со смещением пояса, а не UTC', () => {
    const at = new Date(2026, 8, 10, 1, 5, 9);
    const offset = -at.getTimezoneOffset();
    const sign = offset >= 0 ? '+' : '-';
    const hh = String(Math.abs(Math.trunc(offset / 60))).padStart(2, '0');
    const mm = String(Math.abs(offset % 60)).padStart(2, '0');

    expect(isoWithOffset(at)).toBe(`2026-09-10T01:05:09${sign}${hh}:${mm}`);
  });
});

describe('shiftDay', () => {
  it('ходит по календарю через границы месяца и года', () => {
    expect(shiftDay('2026-09-11', -1)).toBe('2026-09-10');
    expect(shiftDay('2026-09-30', 1)).toBe('2026-10-01');
    expect(shiftDay('2026-01-01', -1)).toBe('2025-12-31');
  });
});

describe('clockOf', () => {
  it('часы и минуты с ведущим нулём, невалидный момент — пусто', () => {
    expect(clockOf(new Date(2026, 8, 11, 9, 5))).toBe('09:05');
    expect(clockOf(new Date(Number.NaN))).toBe('');
  });
});
