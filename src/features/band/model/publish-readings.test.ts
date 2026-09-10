import type { ActivitySample } from '../api';

import { INITIAL, type BandState } from './band-state';
import { readingsOf } from './publish-readings';

const now = new Date(2026, 8, 9, 12, 0);

const sample = (minutes: number, extra: Partial<ActivitySample>): ActivitySample => ({
  at: new Date(2026, 8, 9, 10, minutes),
  source: 'history',
  ...extra,
});

const state = (extra: Partial<BandState>): BandState => ({ ...INITIAL, ...extra });

describe('readingsOf', () => {
  it('день считается по часам телефона', () => {
    expect(readingsOf(INITIAL, now).date).toBe('2026-09-09');
  });

  it('шаги и метры берутся из одной сводки устройства', () => {
    const summary = {
      date: '2026-09-09',
      totals: { steps: 8200, distance: 6100, calories: 320 },
      byActivity: [],
    };
    const readings = readingsOf(state({ summary }), now);

    expect(readings.steps).toBe(8200);
    expect(readings.distanceMeters).toBe(6100);
    expect(readings.calories).toBe(320);
  });

  it('без сводки шаги считаются по поминутной истории', () => {
    const today = [sample(1, { steps: 40 }), sample(2, { steps: 60 })];
    expect(readingsOf(state({ today }), now).steps).toBe(100);
  });

  it('разовый замер важнее ряда: он свежее и точнее', () => {
    const today = [sample(1, { heartRate: 70 })];
    const measurement = { id: 'm', at: now, heartRate: 96 };
    expect(readingsOf(state({ today, measurement }), now).heartRate).toBe(96);
  });

  it('размах пульса за день считается по всему ряду', () => {
    const today = [sample(1, { heartRate: 58 }), sample(2, { heartRate: 132 })];
    const readings = readingsOf(state({ today }), now);

    expect(readings.minHeartRate).toBe(58);
    expect(readings.maxHeartRate).toBe(132);
  });

  it('берётся последняя ночь, а не сумма недели', () => {
    const sleep = [
      { asleep: 300, efficiency: 80 },
      { asleep: 420, efficiency: 91 },
    ] as BandState['sleep'];
    const readings = readingsOf(state({ sleep }), now);

    expect(readings.sleepMinutes).toBe(420);
    expect(readings.sleepEfficiency).toBe(91);
  });

  it('вне живой связи ношение неизвестно, а не «снят»', () => {
    expect(readingsOf(state({ worn: true, stage: 'idle' }), now).worn).toBeUndefined();
    expect(readingsOf(state({ worn: false, stage: 'connected' }), now).worn).toBe(false);
  });

  it('пустое состояние не выдумывает нулей', () => {
    const readings = readingsOf(INITIAL, now);

    expect(readings.steps).toBeUndefined();
    expect(readings.heartRate).toBeUndefined();
    expect(readings.sleepMinutes).toBeUndefined();
    expect(readings.live).toBe(false);
  });
});
