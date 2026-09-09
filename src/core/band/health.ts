import { be16, be32, byteAt } from './bytes';
import { field, intField, parseModal, parseTagged, toDate } from './tlv';

/**
 * Разбор показателей здоровья: дневная сводка, сон, стресс и результат разового
 * замера.
 */

/** Слагаемое дневного итога: устройство считает типы активности по отдельности. */
export type ActivityBlock = {
  /** Номер блока в протоколе. Что именно он означает, вендор не документирует. */
  block: number;
  steps: number;
  /** Метры. */
  distance: number;
  calories: number;
};

export type DaySummary = {
  /** Пульс на момент выборки, а не средний за день. */
  heartRate?: number;
  measuredAt?: Date;
  steps: number;
  /** Метры. */
  distance: number;
  calories: number;
  /**
   * Из чего сложился итог. Калории приходят несколькими блоками — активность
   * отдельно, базовый обмен отдельно, — и без разбивки одно от другого уже не
   * отделить.
   */
  byActivity: ActivityBlock[];
};

/**
 * Дневная сводка приходит несколькими блоками разного типа, и каждый несёт свою
 * часть калорий: блок активности отдельно, базовый обмен отдельно. Итог за день —
 * сумма по всем блокам, поэтому брать один блок нельзя: получится заниженное
 * число, которое не сойдётся с историей.
 */
export function decodeDaySummary(body: Uint8Array): DaySummary {
  const fields = parseModal(body);
  const summary: DaySummary = {
    steps: 0,
    distance: 0,
    calories: 0,
    byActivity: [],
    heartRate: intField(fields, 0x02),
  };

  const measuredAt = toDate(field(fields, 0x03));
  if (measuredAt) summary.measuredAt = measuredAt;

  // Блоки метрик занимают теги с 0x04 по 0x0D — по одному на тип активности.
  for (let tag = 0x04; tag <= 0x0d; tag += 1) {
    const block = field(fields, tag);
    if (!block) continue;

    const metrics = parseTagged(block);
    const part: ActivityBlock = {
      block: tag,
      calories: intField(metrics, 0x01) ?? 0,
      distance: intField(metrics, 0x02) ?? 0,
      steps: intField(metrics, 0x05) ?? 0,
    };

    summary.byActivity.push(part);
    summary.calories += part.calories;
    summary.distance += part.distance;
    summary.steps += part.steps;
  }

  return summary;
}

export const SleepStage = {
  deep: 1,
  light: 2,
  awake: 3,
  rem: 4,
  nap: 5,
  snore: 6,
  sessionStart: 7,
  sessionEnd: 8,
} as const;

export type SleepStageName = keyof typeof SleepStage;

const STAGE_NAMES = Object.fromEntries(
  Object.entries(SleepStage).map(([name, value]) => [value, name]),
) as Record<number, SleepStageName>;

export type SleepSegment = {
  at: Date;
  minutes: number;
  stage: SleepStageName;
};

/**
 * Сон: две служебные байта заголовка, затем записи по семь байт.
 *
 * Стадии взяты из констант SDK вендора, а не из чужих разборов протокола: в
 * популярном реверсе третья и четвёртая перепутаны местами, из-за чего быстрый
 * сон превращается в пробуждения и ночь выглядит рваной.
 */
export function decodeSleep(body: Uint8Array): SleepSegment[] {
  const segments: SleepSegment[] = [];

  for (let offset = 2; offset + 6 < body.length; offset += 7) {
    const seconds = be32(body, offset) ?? 0;
    const minutes = be16(body, offset + 4) ?? 0;
    const stage = STAGE_NAMES[byteAt(body, offset + 6)];
    if (!stage || seconds === 0) continue;

    segments.push({ at: new Date(seconds * 1000), minutes, stage });
  }

  return segments;
}

/** Сколько минут пришлось на каждую стадию. Маркеры сессии не считаются. */
export function sleepTotals(segments: readonly SleepSegment[]): Record<SleepStageName, number> {
  const totals = Object.fromEntries(Object.keys(SleepStage).map((name) => [name, 0])) as Record<
    SleepStageName,
    number
  >;
  for (const segment of segments) totals[segment.stage] += segment.minutes;
  return totals;
}

export type StressSample = {
  at: Date;
  /** Индекс стресса, шкала устройства. */
  value: number;
};

/**
 * Стресс хранится посуточными блоками: время полуночи, шаг измерения и по байту
 * на каждую минуту суток. Ноль означает, что замера не было — таких минут
 * большинство, реальная сетка примерно раз в десять минут.
 */
export function decodeStress(body: Uint8Array): StressSample[] {
  const samples: StressSample[] = [];
  const MINUTES_PER_DAY = 1440;

  // Первые два байта — общая длина, дальше идут блоки.
  let offset = 2;
  while (offset + 6 <= body.length) {
    const midnight = be32(body, offset) ?? 0;
    const step = be16(body, offset + 4) ?? 0;
    if (midnight === 0 || step === 0) break;

    const count = Math.min(Math.floor(MINUTES_PER_DAY / step), body.length - offset - 6);
    for (let minute = 0; minute < count; minute += 1) {
      const value = byteAt(body, offset + 6 + minute);
      if (value === 0) continue;
      samples.push({ at: new Date((midnight + minute * 60 * step) * 1000), value });
    }

    offset += 6 + count;
  }

  return samples;
}

export type Measurement = {
  at: Date;
  heartRate?: number;
  bloodOxygen?: number;
  stress?: number;
  hrv?: number;
  systolic?: number;
  diastolic?: number;
  mood?: number;
};

const MEASURE_TAG = {
  heartRate: 0x01,
  bloodOxygen: 0x02,
  hrv: 0x08,
  stress: 0x10,
  bloodPressure: 0x40,
  mood: 0x80,
} as const;

/**
 * Результат разового замера. Приходит отдельным отчётом примерно через минуту
 * после команды: датчик включается на измерение, а не работает постоянно.
 */
export function decodeMeasurement(frame: Uint8Array): Measurement | null {
  if (frame.length < 10) return null;

  const seconds = be32(frame, 5) ?? 0;
  const result: Measurement = { at: new Date(seconds * 1000) };

  // Теги здесь двухбайтовые, значение предваряется длиной.
  let offset = 9;
  while (offset + 3 <= frame.length) {
    const tag = be16(frame, offset) ?? 0;
    const length = byteAt(frame, offset + 2);
    const start = offset + 3;
    if (start + length > frame.length) break;

    const value = byteAt(frame, start);
    if (tag === MEASURE_TAG.heartRate) result.heartRate = value;
    else if (tag === MEASURE_TAG.bloodOxygen) result.bloodOxygen = value;
    else if (tag === MEASURE_TAG.stress) result.stress = value;
    else if (tag === MEASURE_TAG.hrv) result.hrv = value;
    else if (tag === MEASURE_TAG.mood) result.mood = value;
    else if (tag === MEASURE_TAG.bloodPressure && length >= 2) {
      result.systolic = value;
      result.diastolic = byteAt(frame, start + 1);
    }

    offset = start + length;
  }

  return result;
}

/** Надет ли браслет. Без этого датчик пульса ничего не отдаёт. */
export function decodeWearState(frame: Uint8Array): { at: Date; worn: boolean } | null {
  if (frame.length < 11) return null;

  const seconds = be32(frame, 5) ?? 0;
  return { at: new Date(seconds * 1000), worn: byteAt(frame, 10) !== 0 };
}
