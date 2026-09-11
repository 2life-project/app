import type { BandLimits, Coverage, IngestionRecord } from '../api';

import {
  pruneSnapshots,
  capped,
  fittingCount,
  isSnapshot,
  mergeCoverage,
  pruneSeen,
} from './outbox-pack';

const LIMITS: BandLimits = {
  maxRecordsPerBatch: 3,
  // Запас на обёртку пачки внутри `fittingCount` — 4096 байт: полезного
  // объёма здесь ровно 500, и записи по 223 байта влезают только две.
  maxBatchBytes: 4096 + 500,
  maxRecordBytes: 400,
  audioPartBytes: 8 << 20,
  maxAudioBytes: 256 << 20,
};

function record(size: number, stream: IngestionRecord['stream'] = 'activity_samples') {
  return {
    eventId: 'e',
    sequence: 1,
    stream,
    capturedAt: '2026-09-10T12:00:00.000Z',
    timeQuality: 'known',
    payload: { filler: 'x'.repeat(size) },
  } satisfies IngestionRecord;
}

describe('fittingCount', () => {
  it('не берёт больше записей, чем разрешает приёмник', () => {
    expect(fittingCount([record(1), record(1), record(1), record(1)], LIMITS)).toBe(3);
  });

  it('режет пачку по объёму, а не только по числу', () => {
    expect(fittingCount([record(80), record(80), record(80)], LIMITS)).toBe(2);
  });

  // Такая запись не уедет никогда. Оставить её в голове очереди значит
  // остановить отправку всего остального навсегда.
  it('не даёт одной слишком большой записи заткнуть очередь', () => {
    expect(fittingCount([record(300), record(1)], LIMITS)).toBe(2);
  });

  it('пустая очередь — пустая пачка', () => {
    expect(fittingCount([], LIMITS)).toBe(0);
  });

  // Приёмник меряет пачку в байтах. Длина строки считает кириллицу за один
  // символ, а в UTF-8 это два байта — пачка вышла бы вдвое больше предела.
  it('меряет объём в байтах, а не в символах', () => {
    const cyrillic = { ...record(1), payload: { filler: 'ю'.repeat(120) } };
    expect(fittingCount([cyrillic, record(1)], LIMITS)).toBe(1);
  });
});

describe('mergeCoverage', () => {
  const window = (from: string): Coverage => ({
    stream: 'activity_samples',
    from,
    to: '2026-09-10T23:59:00.000Z',
    complete: false,
  });

  it('одно и то же окно не копится', () => {
    const merged = mergeCoverage([window('a')], [window('a'), window('b')]);
    expect(merged).toHaveLength(2);
  });
});

describe('pruneSeen', () => {
  it('забывает отправленное глубже, чем устройство вообще хранит', () => {
    const now = new Date('2026-09-10T12:00:00Z');
    const fresh = now.getTime() - 24 * 60 * 60 * 1000;
    const old = now.getTime() - 30 * 24 * 60 * 60 * 1000;

    expect(
      pruneSeen({ 'activity_samples|2026-09-09': fresh, 'activity_samples|2026-08-11': old }, now),
    ).toEqual({
      'activity_samples|2026-09-09': fresh,
    });
  });
});

describe('isSnapshot', () => {
  // У снимка нет «следующего»: сводка за сегодня в полдень и вечером — одно
  // событие с разным содержимым, и курсор «докуда отправлено» его отбросил бы.
  it('сводка дня — снимок, минута истории — нет', () => {
    expect(isSnapshot('day_summaries')).toBe(true);
    expect(isSnapshot('activity_samples')).toBe(false);
  });
});

describe('capped', () => {
  it('короткую очередь не трогает', () => {
    expect(capped([1, 2, 3], 1)).toEqual([1, 2, 3]);
  });

  // Замороженная пачка уже могла уехать: её состав менять нельзя, лишнее
  // отбрасывается сразу за ней.
  it('лишнее отбрасывает за замороженной пачкой, а не из неё', () => {
    const pending = Array.from({ length: 5002 }, (_, index) => index);

    const kept = capped(pending, 2);
    expect(kept).toHaveLength(5000);
    expect(kept.slice(0, 2)).toEqual([0, 1]);
    expect(kept[2]).toBe(4);
  });
});

describe('pruneSnapshots', () => {
  it('забывает слоты старше недели, свежие держит', () => {
    const now = new Date('2026-09-11T12:00:00.000Z');
    const kept = pruneSnapshots(
      { 'day_summaries|2026-09-10': 'fresh', 'day_summaries|2026-09-01': 'old', broken: 'x' },
      now,
    );

    expect(kept).toEqual({ 'day_summaries|2026-09-10': 'fresh' });
  });
});
