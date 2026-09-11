import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SleepSession } from '../api';

import { loadNights, mergeNights, rememberNights } from './sleep-store';

function night(from: string, asleep: number): SleepSession {
  const start = new Date(from);
  return {
    from: start,
    to: new Date(start.getTime() + 8 * 60 * 60 * 1000),
    inBed: 480,
    asleep,
    efficiency: Math.round((asleep / 480) * 100),
    awakenings: 1,
    cycles: 4,
    longestBlock: 200,
    totals: { deep: 100, light: 250, rem: 90, awake: 40, nap: 0, snore: 0 },
    shares: { deep: 21, light: 52, rem: 19, awake: 8 },
    segments: [{ at: start, minutes: 30, stage: 'light' }],
  };
}

beforeEach(() => AsyncStorage.clear());

describe('история ночей', () => {
  it('переживает диск вместе с датами', async () => {
    await rememberNights([night('2026-09-09T23:00:00.000Z', 420)]);

    const [stored] = await loadNights();

    expect(stored?.from).toBeInstanceOf(Date);
    expect(stored?.segments[0]?.at.toISOString()).toBe('2026-09-09T23:00:00.000Z');
    expect(stored?.asleep).toBe(420);
  });

  it('свежее чтение той же ночи заменяет прежнее, другие ночи остаются', () => {
    const merged = mergeNights(
      [night('2026-09-08T23:00:00.000Z', 400), night('2026-09-09T23:00:00.000Z', 300)],
      [night('2026-09-09T23:00:00.000Z', 450)],
    );

    expect(merged.map((item) => item.asleep)).toEqual([400, 450]);
  });

  it('копит ночи между чтениями', async () => {
    await rememberNights([night('2026-09-08T23:00:00.000Z', 400)]);
    await rememberNights([night('2026-09-09T23:00:00.000Z', 420)]);

    expect(await loadNights()).toHaveLength(2);
  });
});
