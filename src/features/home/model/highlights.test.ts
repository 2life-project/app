import type { BandReadings } from '@/shared/domain';

import type { HomeData } from '../api/contract';

import { highlightsOf } from './highlights';

const BAND: BandReadings = {
  date: '2026-09-11',
  updatedAt: '2026-09-11T15:35:00.000Z',
  live: true,
  steps: 4650,
  heartRate: 71,
  restingHeartRate: 58,
  stress: 32,
};

function home(): HomeData {
  return {
    date: '2026-09-11',
    rings: {
      recovery: { value: 87, provenance: { source: 'whoop' } },
      movement: {
        status: 'available',
        error: null,
        data: { metrics: { steps: 465, activeEnergyKcal: 12 } },
      },
      nutrition: {
        status: 'available',
        error: null,
        data: { totals: { calories: 0 }, goals: { calories: 2200 } },
      },
      wellbeing: { status: 'available', error: null, data: null },
    },
    widgets: [
      {
        id: 'recover',
        type: 'recover',
        data: { sleep: { duration: { value: 7.5, provenance: { source: 'es100' } } } },
      },
    ],
    streams: [
      {
        key: 'spo2',
        value: 98,
        unit: '%',
        date: '2026-09-11',
        observedAt: '2026-09-11T12:00:00.000Z',
        source: 'es100',
      },
    ],
  } as unknown as HomeData;
}

describe('highlightsOf', () => {
  it('браслет главнее сервера, сервер дополняет, пустого нет', () => {
    const cards = highlightsOf(home(), BAND);
    const byId = Object.fromEntries(cards.map((card) => [card.id, card]));

    expect(byId.steps?.value).toBe('4,650');
    expect(byId.steps?.caption).toMatch(/^band · \d\d:\d\d$/);
    expect(byId.energy?.value).toBe('12');
    expect(byId.heart?.caption).toBe('resting 58');
    expect(byId.spo2?.value).toBe('98');
    expect(byId.sleep?.value).toBe('7.5');
    expect(byId.stress?.value).toBe('32');
    expect(byId.calories?.caption).toBe('of 2,200 kcal goal');
    expect(byId.recovery?.value).toBe('87');
    expect(byId.hrv).toBeUndefined();
  });

  it('без сервера остаётся то, что намерил браслет', () => {
    expect(highlightsOf(null, BAND).map((card) => card.id)).toEqual(['steps', 'heart', 'stress']);
  });
});
