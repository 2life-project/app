import { readingsAge, readingsNote, vitalsOf, type BandReadings } from './band-readings';

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

describe('vitalsOf', () => {
  it('без показаний строк нет', () => {
    expect(vitalsOf(null)).toEqual([]);
    expect(vitalsOf(at('2026-09-09T12:00:00Z'))).toEqual([]);
  });

  it('непрочитанный показатель исчезает, а не становится прочерком', () => {
    const vitals = vitalsOf(at('2026-09-09T12:00:00Z', { restingHeartRate: 54 }));
    expect(vitals.map((vital) => vital.id)).toEqual(['resting']);
  });

  it('пульс покоя важнее текущего: он и есть показатель', () => {
    const vitals = vitalsOf(at('2026-09-09T12:00:00Z', { restingHeartRate: 54, heartRate: 92 }));
    expect(vitals[0]?.value).toBe('54 bpm');
  });

  it('размах за сутки идёт подписью к пульсу, половина размаха — не размах', () => {
    const full = { restingHeartRate: 54, minHeartRate: 48, maxHeartRate: 138 };
    expect(vitalsOf(at('2026-09-09T12:00:00Z', full))[0]?.note).toBe('48–138 today');
    expect(
      vitalsOf(at('2026-09-09T12:00:00Z', { restingHeartRate: 54, minHeartRate: 48 }))[0]?.note,
    ).toBeUndefined();
  });

  it('сон показывается часами и минутами, короткий — минутами', () => {
    const night = { sleepMinutes: 435, sleepEfficiency: 91 };
    expect(vitalsOf(at('2026-09-09T12:00:00Z', night))[0]?.value).toBe('7h 15m');
    expect(vitalsOf(at('2026-09-09T12:00:00Z', { sleepMinutes: 42 }))[0]?.value).toBe('42m');
  });

  it('раздел тела спрашивает только своё', () => {
    const all = { restingHeartRate: 54, bloodOxygen: 97, stress: 30, sleepMinutes: 400, hrv: 42 };
    const readings = at('2026-09-09T12:00:00Z', all);

    expect(vitalsOf(readings, 'heart').map((vital) => vital.id)).toEqual(['resting', 'hrv']);
    expect(vitalsOf(readings, 'breathing').map((vital) => vital.id)).toEqual(['oxygen']);
    expect(vitalsOf(readings, 'recovery').map((vital) => vital.id)).toEqual([
      'sleep',
      'hrv',
      'stress',
    ]);
  });

  it('порядок строк не зависит от порядка полей: сначала сердце, потом ночь', () => {
    const vitals = vitalsOf(
      at('2026-09-09T12:00:00Z', { sleepMinutes: 400, restingHeartRate: 54, stress: 30 }),
    );
    expect(vitals.map((vital) => vital.id)).toEqual(['resting', 'sleep', 'stress']);
  });
});
