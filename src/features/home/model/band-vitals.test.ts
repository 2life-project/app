import type { BandReadings } from '@/shared/domain';

import { bandVitals } from './band-vitals';

const band = (extra: Partial<BandReadings> = {}): BandReadings => ({
  date: '2026-09-09',
  updatedAt: '2026-09-09T12:00:00Z',
  live: true,
  ...extra,
});

describe('bandVitals', () => {
  it('без показаний строк нет', () => {
    expect(bandVitals(null)).toEqual([]);
    expect(bandVitals(band())).toEqual([]);
  });

  it('непрочитанный показатель исчезает, а не становится прочерком', () => {
    const vitals = bandVitals(band({ restingHeartRate: 54 }));
    expect(vitals.map((vital) => vital.id)).toEqual(['resting']);
  });

  it('пульс покоя важнее текущего: он и есть показатель', () => {
    const vitals = bandVitals(band({ restingHeartRate: 54, heartRate: 92 }));
    expect(vitals[0]?.value).toBe('54 bpm');
  });

  it('без пульса покоя показывается текущий', () => {
    expect(bandVitals(band({ heartRate: 92 }))[0]?.value).toBe('92 bpm');
  });

  it('размах за сутки идёт подписью к пульсу', () => {
    const vitals = bandVitals(band({ restingHeartRate: 54, minHeartRate: 48, maxHeartRate: 138 }));
    expect(vitals[0]?.note).toBe('48–138 today');
  });

  it('половина размаха — не размах', () => {
    expect(bandVitals(band({ restingHeartRate: 54, minHeartRate: 48 }))[0]?.note).toBeUndefined();
  });

  it('сон показывается часами и минутами', () => {
    const vitals = bandVitals(band({ sleepMinutes: 435, sleepEfficiency: 91 }));
    expect(vitals[0]?.value).toBe('7h 15m');
    expect(vitals[0]?.note).toBe('91% efficiency');
  });

  it('короткий сон не превращается в ноль часов', () => {
    expect(bandVitals(band({ sleepMinutes: 42 }))[0]?.value).toBe('42m');
  });

  it('порядок строк не зависит от порядка полей: сначала сердце, потом ночь', () => {
    const vitals = bandVitals(band({ sleepMinutes: 400, restingHeartRate: 54, stress: 30 }));
    expect(vitals.map((vital) => vital.id)).toEqual(['resting', 'sleep', 'stress']);
  });
});
