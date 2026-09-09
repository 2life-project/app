import { readingsAge, readingsNote, type BandReadings } from './band-readings';

const at = (updatedAt: string, extra: Partial<BandReadings> = {}): BandReadings => ({
  date: '2026-09-09',
  updatedAt,
  live: false,
  ...extra,
});

describe('readingsAge', () => {
  const now = new Date('2026-09-09T12:00:00Z');

  it('возраст считается в минутах', () => {
    expect(readingsAge(at('2026-09-09T11:30:00Z'), now)).toBe(30);
  });

  it('показания из будущего не дают отрицательный возраст', () => {
    expect(readingsAge(at('2026-09-09T12:05:00Z'), now)).toBe(0);
  });

  it('без показаний возраста нет', () => {
    expect(readingsAge(null, now)).toBeNull();
  });

  it('битая отметка времени не превращается в число', () => {
    expect(readingsAge(at('недавно'), now)).toBeNull();
  });
});

describe('readingsNote', () => {
  const now = new Date('2026-09-09T12:00:00Z');

  it('живая связь названа живой, без возраста', () => {
    expect(readingsNote(at('2026-09-09T11:59:00Z', { live: true }), now)).toBe(
      'from your band, live',
    );
  });

  it('до часа — минуты, дальше — часы', () => {
    expect(readingsNote(at('2026-09-09T11:30:00Z'), now)).toContain('30 min ago');
    expect(readingsNote(at('2026-09-09T08:00:00Z'), now)).toContain('4 h ago');
  });

  it('за сутки точность не нужна', () => {
    expect(readingsNote(at('2026-09-07T08:00:00Z'), now)).toContain('over a day');
  });

  it('без показаний подписи нет: пустая строка соврала бы об источнике', () => {
    expect(readingsNote(null, now)).toBeNull();
  });
});
