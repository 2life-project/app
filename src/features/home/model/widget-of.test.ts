import type { HomeData } from '../api/contract';

import { dosesOf, goalsOf, nextItemsOf, recoverExtraOf, streamsOf } from './widget-of';

const stream = (key: string, value: number, source: string, observedAt: string, stale = false) => ({
  key,
  value,
  unit: key === 'steps' ? 'count' : 'bpm',
  date: '2026-09-11',
  observedAt,
  source,
  stale,
});

function homeWith(streams: readonly unknown[]): HomeData {
  return {
    date: '2026-09-11',
    streams,
    goals: { status: 'available', data: [], error: null },
  } as unknown as HomeData;
}

describe('streamsOf', () => {
  it('оставляет по одному свежему значению на показатель, браслет первым', () => {
    const rows = streamsOf(
      homeWith([
        stream('steps', 22, 'withings', '2026-09-12T00:00:00.000Z'),
        stream('heart_rate', 65, 'es100', '2026-09-11T12:17:36.000Z'),
        stream('heart_rate', 92, 'es100', '2026-09-11T09:00:00.000Z'),
        stream('steps', 465, 'es100', '2026-09-11T12:17:36.000Z'),
      ]),
    );

    expect(rows.map((row) => `${row.title} ${row.value} · ${row.source}`)).toEqual([
      'Heart rate 65 bpm · band',
      'Steps 465 · band',
    ]);
    expect(rows[0]?.when).toBe('today');
  });
});

describe('recoverExtraOf', () => {
  it('берёт сон, ВСР и пульс покоя из конверта виджета', () => {
    const extra = recoverExtraOf({
      hrv: { value: 62.9, unit: 'ms', provenance: { source: 'whoop' } },
      restingHeartRate: { value: 60 },
      sleep: { duration: { value: 7.5, provenance: { source: 'es100' } } },
    });

    expect(extra).toEqual({ sleepHours: 7.5, sleepSource: 'es100', hrvMs: 62.9, restingBpm: 60 });
    expect(recoverExtraOf(null).sleepHours).toBeNull();
  });
});

describe('dosesOf', () => {
  it('раскладывает слоты в строки приёмов', () => {
    const view = dosesOf({
      data: {
        summary: { total: 2, taken: 1 },
        slots: [
          {
            label: 'Утро',
            items: [
              {
                id: 'a',
                expectedTime: '08:00',
                status: 'taken',
                product: { name: 'Omega-3' },
                course: { name: 'Курс' },
              },
              { id: 'b', status: 'pending', product: { name: 'D3' } },
            ],
          },
        ],
      },
    });

    expect(view?.rows.map((row) => `${row.title} ${row.when} ${row.status}`)).toEqual([
      'Omega-3 08:00 taken',
      'D3 Утро pending',
    ]);
    expect(view?.taken).toBe(1);
    expect(dosesOf({ data: null })).toBeNull();
  });
});

describe('goalsOf и nextItemsOf', () => {
  it('цели — словами и с единицей, следующее — только настоящие пункты', () => {
    const home = homeWith([]);
    home.goals.data = [
      { id: 'g1', title: 'weightKg', metric: 'weightKg', target: 77, target_date: '2026-10-26' },
      { id: 'g2', title: 'Вода', metric: 'water_ml', target: 2400 },
    ];

    expect(goalsOf(home).map((row) => `${row.title}: ${row.target}`)).toEqual([
      'Weight: 77 kg',
      'Water: 2,400 ml',
    ]);
    expect(nextItemsOf({ next: [{ id: 'p', kind: 'protocol' }, 'мусор'] })).toHaveLength(1);
  });
});
