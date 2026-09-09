import { be16, be32, byteAt } from './bytes';
import { eventId } from './id';
import { field, intField, parseModal, parseTagged, toDate } from './tlv';

/**
 * Разбор показателей здоровья: дневная сводка, сон, стресс и результат разового
 * замера.
 */

/**
 * Чем человек был занят. Устройство считает каждый вид отдельно и складывает
 * их в день, поэтому без вида блок бесполезен: сон и ходьба неразличимы.
 */
export type ActivityKind =
  | 'unknown'
  | 'walk'
  | 'run'
  | 'climb'
  | 'ride'
  | 'stand'
  | 'lightSleep'
  | 'deepSleep'
  | 'awake'
  | 'swim';

/**
 * Тег блока в сводке → вид активности. Соответствие взято из разбора вендора
 * (`MotionTypes`), а не угадано: номера тегов и номера видов у него разные, и
 * прямое совпадение здесь было бы ошибкой.
 */
const ACTIVITY_BY_TAG: Record<number, ActivityKind> = {
  0x04: 'awake',
  0x05: 'climb',
  0x06: 'deepSleep',
  0x07: 'lightSleep',
  0x08: 'ride',
  0x09: 'run',
  0x0a: 'stand',
  0x0b: 'swim',
  0x0c: 'walk',
  0x0d: 'unknown',
};

/** Слагаемое дневного итога: устройство считает типы активности по отдельности. */
export type ActivityBlock = {
  kind: ActivityKind;
  steps: number;
  /** Метры. */
  distance: number;
  calories: number;
  /** Набор высоты, метры. */
  elevation: number;
  /** Минуты сна в этом блоке: заполнен только у блоков сна. */
  sleepMinutes: number;
};

/** Дневные итоги. Отдельным объектом: так их видит принимающая сторона. */
export type DayTotals = { steps: number; distance: number; calories: number };

export type DaySummary = {
  /** Календарный день по часам телефона. Устройство отдаёт только текущие сутки. */
  date: string;
  totals: DayTotals;
  /** Пульс на момент выборки, а не средний за день. */
  heartRate?: number;
  measuredAt?: Date;
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
/** Виды, у которых шаги имеют смысл. У сна и стояния их быть не должно. */
const STEPPING = new Set<ActivityKind>(['walk', 'run', 'climb']);

/** Календарный ключ дня в местном времени: `YYYY-MM-DD`. */
function dayKey(at: Date): string {
  const month = String(at.getMonth() + 1).padStart(2, '0');
  return `${at.getFullYear()}-${month}-${String(at.getDate()).padStart(2, '0')}`;
}

export function decodeDaySummary(body: Uint8Array): DaySummary {
  const fields = parseModal(body);
  const summary: DaySummary = {
    date: dayKey(new Date()),
    totals: { steps: 0, distance: 0, calories: 0 },
    byActivity: [],
    heartRate: intField(fields, 0x02),
  };

  const measuredAt = toDate(field(fields, 0x03));
  if (measuredAt) summary.measuredAt = measuredAt;

  // Блоки метрик занимают теги с 0x04 по 0x0D — по одному на вид активности.
  for (let tag = 0x04; tag <= 0x0d; tag += 1) {
    const block = field(fields, tag);
    if (!block) continue;

    const metrics = parseTagged(block);
    const part: ActivityBlock = {
      kind: ACTIVITY_BY_TAG[tag] ?? 'unknown',
      calories: intField(metrics, 0x01) ?? 0,
      distance: intField(metrics, 0x02) ?? 0,
      elevation: intField(metrics, 0x03) ?? 0,
      sleepMinutes: intField(metrics, 0x04) ?? 0,
      steps: intField(metrics, 0x05) ?? 0,
    };

    summary.byActivity.push(part);
    summary.totals.calories += part.calories;
    summary.totals.distance += part.distance;

    // Шаги берём только у того, что человек прошёл ногами. Сон и стояние
    // приходят такими же блоками, и слепая сумма приписывала бы к дневным
    // шагам ночь.
    if (STEPPING.has(part.kind)) summary.totals.steps += part.steps;
  }

  // Свой итог калорий устройство считает по собственной формуле, и он не равен
  // сумме блоков. Раз он есть — верим ему, а не нашему сложению.
  const own = intField(fields, 0x01);
  if (own !== undefined && own > 0) summary.totals.calories = own;

  return summary;
}

export type StressSample = {
  at: Date;
  /** Индекс стресса, шкала устройства. */
  value: number;
};

/**
 * Сутки замеров стресса.
 *
 * Сетка отдаётся вместе с замерами, а не выбрасывается после разбора. Без шага
 * принимающая сторона не отличит «в этот час не мерили» от «замер потерялся по
 * дороге»: устройство пишет по байту на минуту и оставляет ноль там, где замера
 * не было, а наружу едут только ненулевые.
 */
export type StressDay = {
  /** Полночь этих суток по времени устройства. */
  midnight: Date;
  /** Через сколько минут стоит следующая ячейка сетки. */
  stepMinutes: number;
  samples: StressSample[];
};

/**
 * Стресс хранится посуточными блоками: время полуночи, шаг измерения и по байту
 * на каждую минуту суток. Ноль означает, что замера не было — таких минут
 * большинство, реальная сетка примерно раз в десять минут.
 */
export function decodeStress(body: Uint8Array): StressDay[] {
  const days: StressDay[] = [];
  const MINUTES_PER_DAY = 1440;

  // Первые два байта — общая длина, дальше идут блоки.
  let offset = 2;
  while (offset + 6 <= body.length) {
    const midnight = be32(body, offset) ?? 0;
    const step = be16(body, offset + 4) ?? 0;
    if (midnight === 0 || step === 0) break;

    const count = Math.min(Math.floor(MINUTES_PER_DAY / step), body.length - offset - 6);
    const samples: StressSample[] = [];
    for (let minute = 0; minute < count; minute += 1) {
      const value = byteAt(body, offset + 6 + minute);
      if (value === 0) continue;
      samples.push({ at: new Date((midnight + minute * 60 * step) * 1000), value });
    }

    days.push({ midnight: new Date(midnight * 1000), stepMinutes: step, samples });
    offset += 6 + count;
  }

  return days;
}

export type Measurement = {
  /** Ключ для устранения повторов на сервере. Ставит клиент — в кадре его нет. */
  id: string;
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
  const at = new Date(seconds * 1000);
  const result: Measurement = { id: eventId(at), at };

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
