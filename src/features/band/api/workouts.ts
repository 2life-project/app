import { be16, be32, byteAt } from './bytes';
import { sportName } from './sports';
import { type Field, intField, parseModal, parseTagged } from './tlv';

/**
 * Тренировки.
 *
 * Устройство регистрирует их **само**: кнопки старта у ES100 нет вовсе, а
 * тренировки в памяти есть — проверено на живой выгрузке, где лежала сессия на
 * 74 минуты с дистанцией, темпом и каденсом.
 *
 * Структура двухуровневая: список ссылок, у каждой своя сводка, а внутри —
 * посекундный ряд и отрезки темпа. В чужих разборах два индекса из списка
 * регулярно склеивают в одно число и получают «тренировку №3610» вместо
 * «третьей тренировки, двадцать шестого отрезка темпа».
 */

/** Ссылка на тренировку в списке устройства. */
export type WorkoutRef = {
  /** Идентификатор тренировки: с ним запрашивается сводка. */
  id: number;
  /** Порядковый номер на устройстве. После сброса нумерация начнётся заново. */
  index: number;
  /** Сколько отрезков темпа записано. */
  paceCount: number;
  sectionCount: number;
  /** Писался ли кислород во время тренировки. */
  bloodOxygen: boolean;
};

export type Workout = {
  id: number;
  from?: Date;
  to?: Date;
  /** Номер вида спорта по классификации вендора. */
  sport?: number;
  sportName?: string;
  /**
   * Остальные поля сводки как есть.
   *
   * Их около полусотни, и раскладка тегов проверена не вся: на устройстве без
   * экрана тренировку не запустить по своему выбору, а угадывать значение тега
   * по одной записи — это выдумывать, а не разбирать.
   */
  fields: Field[];
};

/** Событие активности, которое устройство распознало само. */
export type ActivityState = {
  at: Date;
  /** Минуты. */
  minutes: number;
  /** Тип движения по классификации прошивки. Во всех наблюдениях был `1`. */
  type: number;
  /**
   * Из какого потока запись. Чем потоки отличаются, не установлено: в
   * наблюдениях события второго попадали внутрь окна тренировки, а первого —
   * вне её. Признак сохраняется, чтобы это можно было выяснить на данных.
   */
  stream: 'status' | 'state';
};

/**
 * Живой кадр идущей тренировки: `01 E8 AC 02`.
 *
 * Приходит раз в секунду — вдесятеро чаще обычного отчёта активности. Номера
 * полей сняты с работающего устройства: значения проверялись по тому, как они
 * менялись во время движения, а не по догадке.
 */
export type WorkoutTick = {
  /** Секунд с начала занятия. */
  seconds: number;
  heartRate?: number;
  steps?: number;
  /** Метры. */
  distance?: number;
  calories?: number;
  averageHeartRate?: number;
  at?: Date;
};

const TICK = {
  seconds: 0x01,
  heartRate: 0x02,
  steps: 0x04,
  distance: 0x07,
  calories: 0x08,
  at: 0x0e,
  averageHeartRate: 0x1a,
} as const;

export function decodeWorkoutTick(frame: Uint8Array): WorkoutTick | null {
  if (byteAt(frame, 1) !== 0xe8 || byteAt(frame, 2) !== 0xac || byteAt(frame, 3) !== 0x02) {
    return null;
  }

  // Пятый байт — номер кадра, дальше обычные теги «номер, длина, значение».
  const fields = parseTagged(frame.subarray(5));
  const pick = (tag: number) => intField(fields, tag);

  const seconds = pick(TICK.seconds);
  if (seconds === undefined) return null;

  const at = pick(TICK.at);
  return {
    seconds,
    heartRate: pick(TICK.heartRate),
    steps: pick(TICK.steps),
    distance: pick(TICK.distance),
    calories: pick(TICK.calories),
    averageHeartRate: pick(TICK.averageHeartRate),
    at: at === undefined ? undefined : new Date(at * 1000),
  };
}

const REF_SIZE = 8;
const STATE_SIZE = 7;

/** Потолок кадров одного потока: счётчик приходит одним байтом и может врать. */
export const MAX_STATE_FRAMES = 60;

export function decodeWorkoutList(body: Uint8Array): WorkoutRef[] {
  const refs: WorkoutRef[] = [];

  // Первые два байта — количество, дальше записи по восемь байт.
  for (let offset = 2; offset + REF_SIZE <= body.length; offset += REF_SIZE) {
    refs.push({
      id: be16(body, offset) ?? 0,
      index: be16(body, offset + 2) ?? 0,
      paceCount: byteAt(body, offset + 4),
      sectionCount: byteAt(body, offset + 5),
      bloodOxygen: byteAt(body, offset + 6) === 1,
    });
  }

  return refs;
}

export function decodeWorkout(body: Uint8Array): Workout {
  const fields = parseModal(body);
  const workout: Workout = { id: 0, fields };

  for (const item of fields) {
    if (item.tag === 0x01) workout.id = be16(item.value, 0) ?? 0;
    if (item.tag === 0x02) workout.sport = byteAt(item.value, 0);
    if (item.tag === 0x03) workout.from = timeOf(item.value);
    if (item.tag === 0x04) workout.to = timeOf(item.value);
  }

  if (workout.sport !== undefined) workout.sportName = sportName(workout.sport);
  return workout;
}

/**
 * События движения, распознанные устройством. Два независимых потока: поле
 * `02` и поле `03`. Чем они различаются, не установлено — в наблюдениях второй
 * шёл во время тренировки, а первый вне её.
 */
export function decodeActivityStates(
  body: Uint8Array,
  stream: 'status' | 'state' = 'status',
): ActivityState[] {
  const states: ActivityState[] = [];

  // Первые два байта — номер кадра, дальше записи по семь байт.
  for (let offset = 2; offset + STATE_SIZE <= body.length; offset += STATE_SIZE) {
    const seconds = be32(body, offset + 1) ?? 0;
    if (seconds === 0) continue;

    states.push({
      type: byteAt(body, offset),
      at: new Date(seconds * 1000),
      minutes: be16(body, offset + 5) ?? 0,
      stream,
    });
  }

  return states;
}

/** Каталог видов спорта: что прошивка знает и что из этого включено. */
export type SportCatalog = {
  /** Сколько видов можно держать включёнными одновременно. */
  slots: number;
  /** Все номера, которые понимает прошивка. */
  supported: number[];
  /** Номера, включённые на устройстве сейчас. */
  enabled: number[];
};

export function decodeSportCatalog(body: Uint8Array): SportCatalog {
  const fields = parseModal(body);
  const list = (tag: number): number[] => {
    const value = fields.find((item) => item.tag === tag)?.value;
    // Первый байт — количество, дальше по байту на вид.
    return value ? [...value.subarray(1)] : [];
  };

  return {
    slots: byteAt(fields.find((item) => item.tag === 0x01)?.value ?? new Uint8Array(), 0),
    supported: list(0x03),
    enabled: list(0x04),
  };
}

function timeOf(value: Uint8Array): Date | undefined {
  const seconds = be32(value, 0) ?? 0;
  return seconds === 0 ? undefined : new Date(seconds * 1000);
}
