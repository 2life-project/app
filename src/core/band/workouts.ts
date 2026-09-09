import { be16, be32, byteAt } from './bytes';
import * as cmd from './commands';
import { sportName } from './sports';
import { type Field, parseModal } from './tlv';
import type { BandTransport } from './transport';

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

const REF_SIZE = 8;
const STATE_SIZE = 7;

/** Потолок кадров одного потока: счётчик приходит одним байтом и может врать. */
const MAX_STATE_FRAMES = 60;

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

export class BandWorkouts {
  constructor(private readonly transport: BandTransport) {}

  async list(from: Date, to: Date): Promise<WorkoutRef[]> {
    return decodeWorkoutList(await this.transport.request(cmd.readWorkoutList(from, to)));
  }

  async summary(id: number): Promise<Workout> {
    return decodeWorkout(await this.transport.request(cmd.readWorkoutSummary(id)));
  }

  /** Посекундный ряд тренировки: интервал пять секунд. */
  async detail(id: number, index: number): Promise<Field[]> {
    return parseModal(await this.transport.request(cmd.readWorkoutDetail(id, index)));
  }

  async pace(id: number, paceIndex: number): Promise<Field[]> {
    return parseModal(await this.transport.request(cmd.readWorkoutPace(id, paceIndex)));
  }

  /** Что прошивка умеет и что из этого включено на устройстве. */
  async catalog(): Promise<SportCatalog> {
    return decodeSportCatalog(await this.transport.request(cmd.readSportCatalog()));
  }

  /**
   * Распознанные устройством события движения — оба потока.
   *
   * Счётчик кадров спрашивается отдельно, как и у истории, и приходит одним
   * коротким кадром без терминатора: сборщик многокадровых ответов ждал бы его
   * до истечения времени.
   */
  async states(from: Date, to: Date): Promise<ActivityState[]> {
    return [
      ...(await this.readStream(from, to, 'status')),
      ...(await this.readStream(from, to, 'state')),
    ].sort((a, b) => a.at.getTime() - b.at.getTime());
  }

  private async readStream(
    from: Date,
    to: Date,
    stream: 'status' | 'state',
  ): Promise<ActivityState[]> {
    const counter =
      stream === 'status' ? cmd.readStatusCount(from, to) : cmd.readStateCount(from, to);
    const count = await this.transport.requestRaw(counter, 0xc5);
    const frames = count.length > 0 ? byteAt(count, count.length - 1) : 0;

    const states: ActivityState[] = [];
    for (let index = 0; index < Math.min(frames, MAX_STATE_FRAMES); index += 1) {
      const frame =
        stream === 'status'
          ? cmd.readStatusFrame(from, to, index)
          : cmd.readStateFrame(from, to, index);
      states.push(...decodeActivityStates(await this.transport.request(frame), stream));
    }
    return states;
  }
}
