import { be16, be32, byteAt } from './bytes';

/**
 * Поминутные показатели: и выгрузка истории, и живые отчёты устройства идут
 * одним и тем же кодеком.
 *
 * Слот описан битовой маской: каждый установленный бит — один показатель, а его
 * номер задаёт и смысл, и размер значения. Маска переменной длины: старший бит
 * байта означает «есть продолжение», поэтому номера, кратные восьми, служебные
 * и пропускаются.
 */

export type ActivitySample = {
  /** Начало минуты, к которой относятся значения. */
  at: Date;
  steps?: number;
  calories?: number;
  /** Метры. */
  distance?: number;
  restingHeartRate?: number;
  maxHeartRate?: number;
  minHeartRate?: number;
  heartRate?: number;
  averageHeartRate?: number;
  bloodOxygen?: number;
  systolic?: number;
  diastolic?: number;
  mood?: number;
  hrv?: number;
  /** Ммоль/л. */
  bloodSugar?: number;
  /** Набор высоты за минуту, метры. */
  elevation?: number;
  /**
   * PAI — оценка нагрузки самим устройством: сколько баллов набрано за минуту
   * в лёгкой, средней и высокой интенсивности и сколько минут в каждой из них.
   * Считает браслет по своей модели, пересчитать это на клиенте нельзя.
   */
  paiLow?: number;
  paiMedium?: number;
  paiHigh?: number;
  paiLowMinutes?: number;
  paiMediumMinutes?: number;
  paiHighMinutes?: number;
  /**
   * Откуда слот приехал.
   *
   * `history` — законченная минута из выгрузки, её значения окончательны.
   * `live` — отчёт по текущей минуте: устройство сбрасывает счётчики на её
   * границе, поэтому слот занижен и перезаписывать им историю нельзя.
   *
   * Признаком «недобрано» это быть не может: принимающей стороне нужно знать не
   * то, что слот неполон, а какой из двух потоков его прислал — правило замены
   * строки строится именно на этом.
   */
  source: 'history' | 'live';
};

// `source` — признак кадра, а не показатель: в слоты по маске он не пишется.
type Slot = keyof Omit<ActivitySample, 'at' | 'source'>;

/** Однобайтовые показатели: номер бита → поле. */
const SINGLE: Record<number, Slot> = {
  1: 'steps',
  2: 'calories',
  4: 'restingHeartRate',
  5: 'maxHeartRate',
  6: 'minHeartRate',
  7: 'heartRate',
  9: 'bloodOxygen',
  10: 'restingHeartRate',
  12: 'averageHeartRate',
  13: 'restingHeartRate',
};

/**
 * Двухбайтовые показатели. Номера битов сверены с разбором вендора
 * (`MotionFrame`): пропуск любого из них не ломает кадр, но молча теряет
 * значение — именно так у нас пропадали PAI и высота.
 */
const DOUBLE: Record<number, Slot> = {
  3: 'distance',
  11: 'elevation',
  18: 'mood',
  19: 'paiLow',
  20: 'paiMedium',
  21: 'paiHigh',
  22: 'paiLowMinutes',
  23: 'paiMediumMinutes',
  25: 'paiHighMinutes',
  26: 'hrv',
};

/** Давление занимает два байта, но это два разных значения. */
const PRESSURE = 17;

/** Сахар приходит увеличенным в десять раз, чтобы уместиться в целое. */
const BLOOD_SUGAR = 27;

function readMask(payload: Uint8Array, offset: number): { mask: number; size: number } {
  let mask = 0;
  let size = 0;

  while (offset + size < payload.length && size < 4) {
    const current = byteAt(payload, offset + size);
    mask |= current << (8 * size);
    size += 1;
    if (current < 0x80) break;
  }

  return { mask, size };
}

function readSlot(
  payload: Uint8Array,
  start: number,
  mask: number,
  at: Date,
  source: ActivitySample['source'],
): { sample: ActivitySample; end: number } {
  const sample: ActivitySample = { at, source };
  let offset = start;

  for (let bit = 1; bit <= 32; bit += 1) {
    if (bit % 8 === 0) continue;
    if (!(mask & (1 << (bit - 1)))) continue;

    if (bit === PRESSURE) {
      if (offset + 1 >= payload.length) break;
      sample.systolic = byteAt(payload, offset);
      sample.diastolic = byteAt(payload, offset + 1);
      offset += 2;
      continue;
    }

    const single = SINGLE[bit];
    if (single) {
      if (offset >= payload.length) break;
      sample[single] = byteAt(payload, offset);
      offset += 1;
      continue;
    }

    if (offset + 1 >= payload.length) break;
    const value = be16(payload, offset) ?? 0;
    if (bit === BLOOD_SUGAR) sample.bloodSugar = value / 10;
    else {
      const double = DOUBLE[bit];
      if (double) sample[double] = value;
    }
    offset += 2;
  }

  return { sample, end: offset };
}

/** Есть ли в слоте хоть одно значение: пустые маски устройство тоже присылает. */
function hasValues(sample: ActivitySample): boolean {
  // `at` и `source` есть всегда: значением считается всё сверх них.
  return Object.keys(sample).length > 2;
}

/**
 * Разобрать кадр истории: номер кадра, время начала и дальше слоты со
 * смещением в минутах от этого времени.
 */
export function decodeActivityFrame(body: Uint8Array): {
  index: number;
  samples: ActivitySample[];
} {
  if (body.length < 6) return { index: 0, samples: [] };

  const index = be16(body, 0) ?? 0;
  const base = be32(body, 2) ?? 0;
  const samples: ActivitySample[] = [];

  let offset = 6;
  while (offset + 3 < body.length) {
    const minutes = be16(body, offset) ?? 0;
    const { mask, size } = readMask(body, offset + 2);
    if (size === 0) break;

    const at = new Date((base + minutes * 60) * 1000);
    const { sample, end } = readSlot(body, offset + 2 + size, mask, at, 'history');
    if (hasValues(sample)) samples.push(sample);

    if (end <= offset) break;
    offset = end;
  }

  return { index, samples };
}

/**
 * Разобрать живой отчёт `01 C6 AC 01`. Приходит каждые десять секунд и содержит
 * накопленное за текущую минуту, поэтому значения сбрасываются на её границе.
 */
export function decodeLiveSample(frame: Uint8Array): ActivitySample | null {
  if (frame.length < 12) return null;

  const base = be32(frame, 6) ?? 0;
  const { mask, size } = readMask(frame, 10);
  if (size === 0) return null;

  // Отметка времени округляется до начала минуты: живой отчёт относится к
  // текущей минуте целиком, и без округления один и тот же слот приезжает
  // несколько раз с разными секундами.
  const at = new Date(Math.floor(base / 60) * 60 * 1000);
  const { sample } = readSlot(frame, 10 + size, mask, at, 'live');
  return hasValues(sample) ? sample : null;
}
