import type { Biochemistry, Marker, Observation } from '../api/contract';

import {
  chartable,
  deltaNote,
  freshnessNote,
  isOutOfRange,
  markerRange,
  markerTone,
  outOfRange,
} from './biochemistry';

const marker = (extra: Partial<Marker>): Marker =>
  ({
    markerKey: 'apob',
    status: 'ok',
    freshness: { state: 'fresh', ageDays: 1, needsUpdate: false },
    delta: { absolute: null, percent: null, direction: 'flat', changed: false },
    ...extra,
  }) as Marker;

describe('markerTone', () => {
  it('слова сервера переводятся в тон', () => {
    expect(markerTone('hi')).toBe('danger');
    expect(markerTone('lo')).toBe('danger');
    expect(markerTone('warn')).toBe('warning');
    expect(markerTone('ok')).toBe('success');
  });

  it('незнакомое слово остаётся нейтральным, а не тревожным', () => {
    expect(markerTone('unknown')).toBe('neutral');
    expect(markerTone('borderline_high_v2')).toBe('neutral');
  });
});

describe('isOutOfRange', () => {
  it('вне нормы — hi, lo и warn', () => {
    expect(['hi', 'lo', 'warn'].map((s) => isOutOfRange(marker({ status: s })))).toEqual([
      true,
      true,
      true,
    ]);
  });

  it('неизвестный статус не считается отклонением', () => {
    expect(isOutOfRange(marker({ status: 'unknown' }))).toBe(false);
    expect(isOutOfRange(marker({ status: 'ok' }))).toBe(false);
  });
});

describe('outOfRange', () => {
  it('важные для сервера идут первыми', () => {
    const data = {
      markersByKey: {
        a: marker({ markerKey: 'a', status: 'hi' }),
        b: marker({ markerKey: 'b', status: 'warn' }),
      },
      importantKeys: ['b'],
    } as unknown as Biochemistry;

    expect(outOfRange(data, 5).map((m) => m.markerKey)).toEqual(['b', 'a']);
  });
});

describe('markerRange', () => {
  it('текст лаборатории важнее чисел — он же напечатан в бланке', () => {
    expect(markerRange(marker({ refText: '0.6–1.6', refLow: 1, refHigh: 2 }))).toBe('0.6–1.6');
  });

  it('односторонняя норма читается как неравенство', () => {
    expect(markerRange(marker({ refText: null, refLow: null, refHigh: 1 }))).toBe('< 1');
    expect(markerRange(marker({ refText: null, refLow: 5, refHigh: null }))).toBe('> 5');
    expect(markerRange(marker({ refText: null, refLow: null, refHigh: null }))).toBeNull();
  });
});

describe('freshnessNote', () => {
  it('свежее не комментируем', () => {
    expect(freshnessNote(marker({}))).toBeNull();
  });

  it('устаревшее зовёт пересдать', () => {
    const stale = marker({ freshness: { state: 'stale', ageDays: 800, needsUpdate: true } });
    expect(freshnessNote(stale)).toBe('2 y ago · worth repeating');
  });
});

describe('deltaNote', () => {
  it('без изменения подписи нет', () => {
    expect(deltaNote({ absolute: 1, percent: 2, direction: 'up', changed: false })).toBeNull();
  });

  it('направление показано стрелкой, величина — по модулю', () => {
    expect(deltaNote({ absolute: -1, percent: -14.4, direction: 'down', changed: true })).toBe(
      '↓ 14%',
    );
  });
});

describe('chartable', () => {
  const point = (extra: Partial<Observation>) =>
    ({
      chartEligibility: { eligible: true, reasons: [], severity: 'none' },
      chartValue: 1,
      ...extra,
    }) as Observation;

  it('отсеянное сервером на график не идёт', () => {
    const points = [
      point({ chartValue: 1 }),
      point({ chartEligibility: { eligible: false, reasons: ['duplicate'], severity: 'info' } }),
      point({ chartValue: 3 }),
    ];
    expect(chartable(points)).toEqual([1, 3]);
  });

  it('пустое значение не превращается в ноль на графике', () => {
    expect(chartable([point({ chartValue: null })])).toEqual([]);
  });
});
