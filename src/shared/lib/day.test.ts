import { dayIn, longDay, shortDay, weekdayOf } from './day';

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
