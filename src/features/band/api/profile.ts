import { Mode } from './frame';
import { encodeBatch, tlv, tlvByte, tlvWord } from './outbound';

/**
 * Настройки, которые пишутся на устройство пачкой: профиль человека, дневная
 * цель, автозамер стресса и управление тренировкой.
 *
 * Байт группы у них вендор не пишет литералом — он собирает кадр как
 * `[i>>8][i&0xff] [i2>>8][i2&0xff] [секция]`, где `i` это `0x01<группа>`, а
 * `i2` — `<режим><поле>`. Правило проверено на командах с известными группами и
 * подтверждено живой записью: интервал автозамера стресса менялся и вернулся.
 */

// ----------------------------------------------------- профиль, цель, стресс
//
// Байт группы у этих трёх команд вендор не пишет литералом: он собирает кадр
// как `[i>>8][i&0xff] [i2>>8][i2&0xff] [секция]`, где `i` — это `0x01<группа>`,
// а `i2` — `<режим><поле>`. Отсюда `481 → 01 E1`, `450 → 01 C2`, `449 → 01 C1`.
//
// Правило проверено на командах, чьи группы мы знаем точно: `setAlarmList` даёт
// `01 C7`, `setLanguage` — `01 A5`, `setHeartRateInterval` — `01 E1`,
// `setTodayWeather` — `01 E0`, `setWorkOutManageInfo` — `01 EC`. Все пять
// совпали с тем, что уже работает на живом устройстве.

const HEALTH = 0xe1;
const GOAL = 0xc1;
const PROFILE = 0xc2;

/**
 * Автозамер стресса: включённость и интервал идут одной пачкой.
 *
 * Поля записи и чтения здесь разные — читается состояние полем `0x12`, а
 * пишется парой `0x07` и `0x0D`. Выводить одно из другого нельзя.
 */
export function autoStress(enabled: boolean, intervalMinutes: number): Uint8Array[] {
  return encodeBatch(HEALTH, Mode.write, [
    tlvByte(0x07, enabled ? 1 : 0),
    tlvByte(0x0d, intervalMinutes),
  ]);
}

/** Как браслет носят: от этого зависит распознавание жестов. */
export const WearHand = { left: 0, right: 1 } as const;

export type UserProfile = {
  /** Полных лет. */
  age: number;
  birth: { year: number; month: number; day: number };
  /** 0 — женский, 1 — мужской: шкала прошивки, не наша. */
  gender: number;
  /** Сантиметры. */
  height: number;
  /** Килограммы. */
  weight: number;
  /** Длина шага в сантиметрах: по ней устройство считает дистанцию. */
  walkStepLength: number;
  runStepLength: number;
  /** Мл/кг/мин и время замера в секундах эпохи. Ноль, если не измеряли. */
  maxOxygenUptake?: number;
  maxOxygenUptakeAt?: number;
  wearHand?: number;
};

/**
 * Отправить профиль на устройство.
 *
 * Без него браслет считает дистанцию и калории по заводским значениям роста,
 * веса и длины шага — а мы читаем этот результат как измеренный факт и строим
 * на нём пороги. Одна запись при привязке убирает систематическую ошибку из
 * всех производных чисел разом.
 */
export function userProfile(profile: UserProfile): Uint8Array[] {
  return encodeBatch(PROFILE, Mode.write, [
    tlvByte(0x01, profile.age),
    tlv(
      0x02,
      Uint8Array.from([
        (profile.birth.year >> 8) & 0xff,
        profile.birth.year & 0xff,
        profile.birth.month & 0xff,
        profile.birth.day & 0xff,
      ]),
    ),
    tlvByte(0x03, profile.gender),
    tlvByte(0x04, profile.height),
    tlvByte(0x05, profile.maxOxygenUptake ?? 0),
    tlvLong(0x06, profile.maxOxygenUptakeAt ?? 0),
    tlvByte(0x07, profile.runStepLength),
    tlvByte(0x08, profile.walkStepLength),
    tlvByte(0x09, profile.weight),
    tlvByte(0x0a, profile.wearHand ?? WearHand.left),
  ]);
}

export type MotionGoal = {
  /** Вид активности, к которому относится цель. */
  motionType: number;
  /** Что именно считается целью: шаги, калории, дистанция, длительность. */
  goalType: number;
  steps: number;
  calories: number;
  /** Метры. */
  distance: number;
  /** Минуты. */
  duration: number;
};

/** Дневная цель на самом устройстве, а не только в приложении. */
export function motionGoal(goal: MotionGoal): Uint8Array[] {
  return encodeBatch(GOAL, Mode.write, [
    tlvByte(0x01, goal.motionType),
    tlvByte(0x02, goal.goalType),
    tlvLong(0x03, goal.steps),
    tlvWord(0x04, goal.calories),
    tlvLong(0x05, goal.distance),
    tlvWord(0x06, goal.duration),
  ]);
}

/** Четырёхбайтовое значение внутри пачки. */
export function tlvLong(tag: number, value: number): Uint8Array {
  return tlv(
    tag,
    Uint8Array.from([
      (value >>> 24) & 0xff,
      (value >>> 16) & 0xff,
      (value >>> 8) & 0xff,
      value & 0xff,
    ]),
  );
}

// ------------------------------------------------------------- тренировка
//
// Тренировку начинает приложение, а не браслет. У ES100 нет ни экрана, ни
// кнопки старта, а группы автораспознавания движения в прошивке нет вовсе —
// поэтому «браслет сам заведёт занятие» здесь не работает никогда. Пока никто
// не начал, устройство отвечает состоянием 7: «не запущена».

const OPERATOR = 0xe5;

/** Что делаем с тренировкой. Значения 5–7 устройство возвращает, а не принимает. */
export const WorkoutOperator = {
  none: 0,
  start: 1,
  pause: 2,
  resume: 3,
  finish: 4,
  /** Ответные состояния: идёт, на паузе, не запущена. */
  running: 5,
  paused: 6,
  notStarted: 7,
} as const;

/** Обычная тренировка. Остальные виды — беговой план и курсы — у ES100 нет. */
const SPORT_TYPE_WORKOUT = 1;

/** Вложенный блок накопленного: расстояние, калории и длительность по три байта. */
function progress(distance: number, calories: number, seconds: number): Uint8Array {
  const three = (v: number) => [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
  return tlv(
    0x07,
    Uint8Array.from([1, 3, ...three(distance), 2, 3, ...three(calories), 3, 3, ...three(seconds)]),
  );
}

export type WorkoutCommand = {
  operator: number;
  /** Номер вида спорта из каталога устройства. */
  sport: number;
  /** Накопленное на момент команды: при старте нули, при финише итог. */
  distance?: number;
  calories?: number;
  seconds?: number;
  startedAt?: Date;
  /** Запретить паузу на устройстве. */
  forbidPause?: boolean;
};

/**
 * Команда тренировки: старт, пауза, продолжение, финиш.
 *
 * Поля `01` в записи нет — оно только на чтение и несёт текущее состояние.
 */
export function workoutCommand(command: WorkoutCommand): Uint8Array[] {
  const now = Math.floor(Date.now() / 1000);
  const started = Math.floor((command.startedAt?.getTime() ?? Date.now()) / 1000);

  return encodeBatch(OPERATOR, Mode.write, [
    tlvByte(0x02, command.operator),
    tlvByte(0x03, SPORT_TYPE_WORKOUT),
    tlvLong(0x04, 0),
    tlvByte(0x05, command.sport),
    tlvLong(0x06, now),
    progress(command.distance ?? 0, command.calories ?? 0, command.seconds ?? 0),
    tlvByte(0x08, 0),
    tlvLong(0x09, started),
    tlvByte(0x0a, 0),
    tlvByte(0x0b, command.forbidPause ? 1 : 0),
  ]);
}
