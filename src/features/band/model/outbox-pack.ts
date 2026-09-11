import { logger } from '@/core/log/logger';

import type { BandLimits, BandStream, Coverage, IngestionRecord } from '../api';

/**
 * Правила укладки очереди: что считается одним событием, сколько записей
 * влезает в пачку и что очередь помнит об уже отправленном.
 *
 * Отдельно от хранилища намеренно: это чистые решения, которые надо проверять
 * тестом, а не подписью в коде рядом с `AsyncStorage`.
 */

/**
 * Потоки-снимки: их запись описывает состояние на момент чтения и меняется по
 * ходу дня. Курсор «докуда отправлено» для них бессмыслен — сводка за сегодня
 * в полдень и вечером это одно событие с разным содержимым, и уехать должно
 * последнее.
 */
const SNAPSHOTS: ReadonlySet<BandStream> = new Set<BandStream>([
  'day_summaries',
  'stress_days',
  'device_info',
  'device_state',
  'capabilities',
  'settings',
  'recording_inventory',
]);

export function isSnapshot(stream: BandStream): boolean {
  return SNAPSHOTS.has(stream);
}

/**
 * Потолок очереди. Больше пяти тысяч записей — это трое суток непрерывной
 * работы без сети, а глубже четырёх суток устройство историю и не хранит:
 * очередь такой длины означает, что отправка сломана, а не что человек уехал
 * за город. Лишнее отбрасывается с головы и пишется в лог как ошибка.
 */
const MAX_PENDING = 5000;

/**
 * Обрезать очередь до потолка. С головы — но не из замороженной пачки: её
 * повтор обязан совпадать с уже отправленным байт в байт.
 */
export function capped<T>(pending: readonly T[], frozen: number): T[] {
  const overflow = pending.length - MAX_PENDING;
  if (overflow <= 0) return [...pending];

  logger.error('band: очередь отправки переполнена, старое отброшено', {
    dropped: overflow,
    kept: MAX_PENDING,
  });
  return [...pending.slice(0, frozen), ...pending.slice(frozen + overflow)];
}

/** Сутки, за которые очередь помнит отправленное. Глубже устройство не хранит. */
const SEEN_DAYS = 7;

export function pruneSeen(seen: Record<string, number>, now: Date): Record<string, number> {
  const edge = now.getTime() - SEEN_DAYS * 24 * 60 * 60 * 1000;
  return Object.fromEntries(Object.entries(seen).filter(([, at]) => at >= edge));
}

/** Память о полученных снимках живёт столько же: сутки — в самом ключе слота. */
export function pruneSnapshots(
  snapshots: Record<string, string>,
  now: Date,
): Record<string, string> {
  const edge = now.getTime() - SEEN_DAYS * 24 * 60 * 60 * 1000;
  return Object.fromEntries(
    Object.entries(snapshots).filter(
      ([slot]) => Date.parse(slot.slice(slot.indexOf('|') + 1)) >= edge,
    ),
  );
}

/** Личность окна покрытия: поток и его границы. */
export function coverageKey(window: Coverage): string {
  return `${window.stream}|${window.from}|${window.to}`;
}

/** Окна покрытия складываются без повторов: одно и то же окно уедет один раз. */
export function mergeCoverage(stored: readonly Coverage[], added: readonly Coverage[]): Coverage[] {
  const merged = new Map<string, Coverage>();
  for (const window of [...stored, ...added]) merged.set(coverageKey(window), window);
  return [...merged.values()];
}

/** Размер в байтах UTF-8 — так его считает приёмник. Длина строки врёт на кириллице вдвое. */
const BYTES = new TextEncoder();

/**
 * Сколько записей с головы очереди влезает в одну пачку.
 *
 * Пределы объявляет сам приёмник при регистрации, поэтому зашивать их числами
 * нельзя. Считается и число записей, и объём: пачку сверх предела он отклоняет
 * целиком, и одна большая запись увела бы за собой пятьсот нормальных.
 */
export function fittingCount(pending: readonly IngestionRecord[], limits: BandLimits): number {
  // Запас на обёртку пачки: идентификаторы, пояс, версия модуля, окна покрытия.
  const budget = limits.maxBatchBytes - 4096;
  let bytes = 0;
  let count = 0;

  for (const record of pending) {
    if (count >= limits.maxRecordsPerBatch) break;
    const size = BYTES.encode(JSON.stringify(record)).length + 1;

    if (size > limits.maxRecordBytes) {
      // Такая запись не уедет никогда и заткнёт очередь собой. Берём её в
      // пачку, чтобы приёмник ответил на неё отказом и очередь двинулась
      // дальше: молча выбросить измерение нельзя, а держать вечно — нечем.
      logger.error('band: запись больше предела приёмника', { stream: record.stream, size });
      count += 1;
      continue;
    }

    if (bytes + size > budget && count > 0) break;
    bytes += size;
    count += 1;
  }

  return count;
}
