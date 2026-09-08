import { concat } from './bytes';
import { Mode, encode, encodeReadAll } from './frame';
import { encodeTime } from './tlv';

/**
 * Команды браслета. Здесь только сборка кадров — отправкой занимается транспорт,
 * разбором ответов — декодеры.
 *
 * Номера полей у чтения и записи разные даже для одной настройки: язык читается
 * полем 08, а пишется полем 06. Поэтому команды перечислены явно, а не выведены
 * из общей таблицы: сэкономленные двадцать строк не стоят молча испорченной
 * настройки на чужом устройстве.
 */

const Cmd = {
  time: 0xa3,
  info: 0xa4,
  system: 0xa5,
  notifications: 0xb1,
  daySummary: 0xc3,
  reminders: 0xc4,
  historyCount: 0xc5,
  history: 0xc6,
  alarms: 0xc7,
  weather: 0xe0,
  health: 0xe1,
  workout: 0xe8,
  doNotDisturb: 0xea,
  sports: 0xec,
} as const;

/** Тип измерения для команды запуска замера. Значения складываются маской. */
export const MeasureType = {
  heartRate: 0x01,
  bloodOxygen: 0x02,
  ecg: 0x04,
  hrv: 0x08,
  stress: 0x10,
  temperature: 0x20,
  bloodPressure: 0x40,
  mood: 0x80,
} as const;

const byte = (value: number) => Uint8Array.from([value & 0xff]);
const word = (value: number) => Uint8Array.from([(value >> 8) & 0xff, value & 0xff]);

// ---------------------------------------------------------------- устройство

export const readDeviceInfo = () => encodeReadAll(Cmd.info);
export const readBattery = () => encode(Cmd.info, Mode.read, 0x16);
export const readVendorName = () => encode(Cmd.info, Mode.read, 0x0c);
export const readTime = () => encode(Cmd.time, Mode.read, 0xaa);

/**
 * Установка времени идёт без байта режима — сразу поле, так устроена эта группа.
 * Смещение часового пояса кодируется старшим битом как знаком.
 *
 * Ставить время обязательно при каждом подключении: браслет теряет часы при
 * потере связи, а время старта записи служит её идентификатором. Со сбитыми
 * часами весь список записей и история встают не в те даты.
 */
export function writeTime(now: Date): Uint8Array {
  const offsetMinutes = -now.getTimezoneOffset();
  const hours = Math.trunc(Math.abs(offsetMinutes) / 60);
  const minutes = Math.abs(offsetMinutes) % 60;
  const zone = (offsetMinutes >= 0 ? 0x80 : 0x00) | hours;

  return concat(
    Uint8Array.from([0x01, Cmd.time, 0x01, 0x04]),
    encodeTime(now),
    Uint8Array.from([0x10, 0x02, zone, minutes]),
  );
}

// ---------------------------------------------------------------- настройки

export const readSettings = () => encode(Cmd.system, Mode.read, 0x01);
export const readLanguage = () => encode(Cmd.system, Mode.read, 0x08);
export const readLengthUnits = () => encode(Cmd.system, Mode.read, 0x04);
export const readScreenTimeout = () => encode(Cmd.system, Mode.read, 0x09);
export const readScreenTimeoutOptions = () => encode(Cmd.system, Mode.read, 0x0b);
export const readWearState = () => encode(Cmd.system, Mode.read, 0x07);

export const writeLanguage = (code: number) => encode(Cmd.system, Mode.write, 0x06, byte(code));
export const writeLengthUnits = (metric: boolean) =>
  encode(Cmd.system, Mode.write, 0x07, byte(metric ? 0 : 1));
export const writeWeightUnits = (metric: boolean) =>
  encode(Cmd.system, Mode.write, 0x09, byte(metric ? 0 : 1));
export const writeScreenTimeout = (seconds: number) =>
  encode(Cmd.system, Mode.write, 0x08, byte(seconds));

/** Вибрация «найти браслет». Экрана нет, поэтому это единственный способ его позвать. */
export const findBand = (on: boolean) => encode(Cmd.system, Mode.write, 0x04, byte(on ? 1 : 0));

// ---------------------------------------------------------------- здоровье

export const readHeartRateInterval = () => encode(Cmd.health, Mode.read, 0x0b);
export const readOxygenInterval = () => encode(Cmd.health, Mode.read, 0x0c);
export const readContinuousHeartRate = () => encode(Cmd.health, Mode.read, 0x10);
export const readContinuousOxygen = () => encode(Cmd.health, Mode.read, 0x11);
export const readHeartRateHighLimit = () => encode(Cmd.health, Mode.read, 0x15);
export const readHeartRateLowLimit = () => encode(Cmd.health, Mode.read, 0x16);

export const writeAutoHeartRate = (on: boolean) =>
  encode(Cmd.health, Mode.write, 0x01, byte(on ? 1 : 0));
export const writeContinuousHeartRate = (on: boolean) =>
  encode(Cmd.health, Mode.write, 0x02, byte(on ? 1 : 0));
export const writeHeartRateInterval = (minutes: number) =>
  encode(Cmd.health, Mode.write, 0x0b, byte(minutes));
export const writeOxygenInterval = (minutes: number) =>
  encode(Cmd.health, Mode.write, 0x0c, byte(minutes));

export const writeHeartRateHighLimit = (on: boolean, limit: number) =>
  encode(Cmd.health, Mode.write, 0x03, Uint8Array.from([on ? 1 : 0, limit]));
export const writeHeartRateLowLimit = (on: boolean, limit: number) =>
  encode(Cmd.health, Mode.write, 0x04, Uint8Array.from([on ? 1 : 0, limit]));

/** Разовый замер по кнопке приложения. Результат приходит отчётом через минуту. */
export const measureOnce = () => encode(Cmd.health, Mode.write, 0x12);

/** Замер выбранных показателей: маска из MeasureType. */
export const measure = (types: number, on: boolean) =>
  encode(Cmd.health, Mode.write, 0x13, concat(word(types), byte(on ? 1 : 0)));

// ---------------------------------------------------------------- история

export const readDaySummary = () => encodeReadAll(Cmd.daySummary);

/** Сколько кадров активности накопилось за период. */
export const readActivityCount = (from: Date, to: Date) =>
  encode(Cmd.historyCount, Mode.read, 0x01, concat(encodeTime(from), encodeTime(to)));

export const readActivityFrame = (from: Date, to: Date, index: number) =>
  encode(Cmd.history, Mode.read, 0x01, concat(encodeTime(from), encodeTime(to), word(index)));

export const readStatusCount = (from: Date, to: Date) =>
  encode(Cmd.historyCount, Mode.read, 0x02, concat(encodeTime(from), encodeTime(to)));

export const readStatusFrame = (from: Date, to: Date, index: number) =>
  encode(Cmd.history, Mode.read, 0x02, concat(encodeTime(from), encodeTime(to), word(index)));

export const readSleep = (from: Date, to: Date) =>
  encode(Cmd.history, Mode.read, 0x04, concat(encodeTime(from), encodeTime(to)));

export const readStress = (from: Date, to: Date) =>
  encode(Cmd.health, Mode.read, 0x02, concat(encodeTime(from), encodeTime(to)));

// ---------------------------------------------------------------- тренировки

export const readWorkoutList = (from: Date, to: Date) =>
  encode(Cmd.workout, Mode.read, 0x01, concat(encodeTime(from), encodeTime(to)));

export const readWorkoutSummary = (id: number) => encode(Cmd.workout, Mode.read, 0x02, word(id));

export const readWorkoutDetail = (id: number, index: number, newAlgorithm = 0) =>
  encode(Cmd.workout, Mode.read, 0x03, concat(word(id), word(index), byte(newAlgorithm)));

export const readWorkoutPace = (id: number, paceIndex: number) =>
  encode(Cmd.workout, Mode.read, 0x04, concat(word(id), byte(paceIndex)));

export const readSportCatalog = () => encodeReadAll(Cmd.sports);

// ---------------------------------------------------------------- режимы

export const readAlarms = () => encodeReadAll(Cmd.alarms);
export const readDoNotDisturb = () => encode(Cmd.doNotDisturb, Mode.read, 0x01);
export const readActivityReminder = () => encode(Cmd.reminders, Mode.read, 0x01);
export const readNotificationLimits = () => encodeReadAll(Cmd.notifications);
export const readWeatherSupport = () => encode(Cmd.weather, Mode.read, 0x01);

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
