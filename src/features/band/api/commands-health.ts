import { concat } from './bytes';
import { Cmd, byte, word } from './commands';
import { Mode, encode } from './frame';
import { encodeTime } from './tlv';

/**
 * Автозамеры, пороги и зоны пульса — всё, чем управляется группа здоровья.
 *
 * Вынесено из общего списка команд не по размеру, а по свойству: здесь у каждой
 * настройки поле чтения и поле записи разные, и каждая строка сверена с
 * одноимённым методом вендорского SDK. Выводить их друг из друга нельзя.
 */

export const readAutoStress = () => encode(Cmd.health, Mode.read, 0x12);
export const readAutoMood = () => encode(Cmd.health, Mode.read, 0x13);
export const readAutoBloodPressure = () => encode(Cmd.health, Mode.read, 0x14);
export const readStressInterval = () => encode(Cmd.health, Mode.read, 0x0d);
export const readMoodInterval = () => encode(Cmd.health, Mode.read, 0x0e);
export const readBloodPressureInterval = () => encode(Cmd.health, Mode.read, 0x0f);
export const readBloodPressureUnit = () => encode(Cmd.health, Mode.read, 0x19);

/** Порог тревоги по низкому кислороду: включённость и сам процент. */
export const readOxygenLowLimit = () => encode(Cmd.reminders, Mode.read, 0x03);

export const writeAutoMood = (on: boolean) =>
  encode(Cmd.health, Mode.write, 0x0e, byte(on ? 1 : 0));

export const writeAutoBloodPressure = (on: boolean) =>
  encode(Cmd.health, Mode.write, 0x10, byte(on ? 1 : 0));

export const writeMoodInterval = (minutes: number) =>
  encode(Cmd.health, Mode.write, 0x0f, word(minutes));

export const writeBloodPressureInterval = (minutes: number) =>
  encode(Cmd.health, Mode.write, 0x11, word(minutes));

/**
 * Зоны пульса на самом устройстве.
 *
 * Порядок и длины полей воспроизводят кадр вендора байт в байт, включая тег
 * `0x10`, который у него повторяет `0x04`. Это не описка при переносе: «исправить»
 * заведомо работающий кадр догадкой опаснее, чем повторить его как есть.
 */
export const writeHeartRateZones = (zones: {
  warmUp: number;
  fatBurn: number;
  aerobic: number;
  anaerobicAdvance: number;
  lowerLimit: number;
  upperLimit: number;
  warnEnabled: boolean;
  warnMax: number;
  kind: number;
  maxHeartRate: number;
  restHeartRate: number;
  aerobicBase: number;
  aerobicAdvance: number;
  lacticAcid: number;
  anaerobicBase: number;
}) =>
  encode(
    Cmd.health,
    Mode.write,
    0x08,
    concat(
      ...(
        [
          [0x01, zones.warmUp],
          [0x02, zones.fatBurn],
          [0x03, zones.aerobic],
          [0x04, zones.anaerobicAdvance],
          [0x05, zones.lowerLimit],
          [0x06, zones.upperLimit],
          [0x07, zones.warnEnabled ? 1 : 0],
          [0x08, zones.warnMax],
          [0x09, zones.kind],
          [0x0a, zones.maxHeartRate],
          [0x0b, zones.restHeartRate],
          [0x0c, zones.aerobicBase],
          [0x0d, zones.aerobicAdvance],
          [0x0e, zones.lacticAcid],
          [0x0f, zones.anaerobicBase],
          [0x10, zones.anaerobicAdvance],
        ] as const
      ).map(([tag, value]) => Uint8Array.from([tag, 0x01, value & 0xff])),
    ),
  );

export const writeBloodPressureUnit = (unit: number) =>
  encode(Cmd.health, Mode.write, 0x16, byte(unit));

/** Непрерывный кислород. Живёт в группе напоминаний, а читается из health. */
export const writeContinuousOxygen = (on: boolean) =>
  encode(Cmd.reminders, Mode.write, 0x03, byte(on ? 1 : 0));

export const writeOxygenLowLimit = (on: boolean, percent: number) =>
  encode(Cmd.reminders, Mode.write, 0x04, Uint8Array.from([on ? 1 : 0, percent & 0xff]));

/**
 * Режим «не беспокоить». Поля идут подряд: два флага, затем начало и конец
 * периода, затем что именно глушить.
 */
export function writeDoNotDisturb(options: {
  allDay: boolean;
  scheduled: boolean;
  fromHour: number;
  fromMinute: number;
  toHour: number;
  toMinute: number;
  muteVibration: boolean;
  muteMessages: boolean;
}): Uint8Array {
  return encode(
    Cmd.doNotDisturb,
    Mode.write,
    0x01,
    Uint8Array.from([
      options.allDay ? 1 : 0,
      options.scheduled ? 1 : 0,
      options.fromHour,
      options.fromMinute,
      options.toHour,
      options.toMinute,
      options.muteVibration ? 1 : 0,
      options.muteMessages ? 1 : 0,
    ]),
  );
}

/**
 * События тревог за период: когда показатель вышел за заданный порог.
 *
 * Канал живой — устройство отвечает пустым списком, когда событий нет. Порог
 * задаётся отдельно (верхний и нижний пульс, низкий кислород), а срабатывания
 * копятся здесь.
 */
export const readWarningEvents = (from: Date, to: Date) =>
  encode(
    Cmd.health,
    Mode.read,
    0x01,
    concat(encodeTime(from), encodeTime(to), Uint8Array.from([1])),
  );

/** Напоминание о малоподвижности: включённость, интервал и рабочее окно. */
export const readActivityReminder = () => encode(Cmd.reminders, Mode.read, 0x01);

export const writeActivityReminder = (options: {
  enabled: boolean;
  intervalMinutes: number;
  from: { hour: number; minute: number };
  to: { hour: number; minute: number };
  /** Битовая маска дней недели, как у будильников. */
  days: number;
}) =>
  encode(
    Cmd.reminders,
    Mode.write,
    0x01,
    Uint8Array.from([
      options.enabled ? 1 : 0,
      (options.intervalMinutes >> 8) & 0xff,
      options.intervalMinutes & 0xff,
      options.from.hour,
      options.from.minute,
      options.to.hour,
      options.to.minute,
      options.days & 0xff,
    ]),
  );

/**
 * Улучшенный разбор сна на устройстве. На живом браслете включён с завода —
 * значит стадии, которые мы читаем, посчитаны уже им, а не простым порогом.
 */
export const readSciSleep = () => encode(Cmd.reminders, Mode.read, 0x02);

export const writeSciSleep = (on: boolean) =>
  encode(Cmd.reminders, Mode.write, 0x02, byte(on ? 1 : 0));
