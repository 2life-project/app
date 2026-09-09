import { concat, toBe16 } from './bytes';
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

export const Cmd = {
  time: 0xa3,
  info: 0xa4,
  system: 0xa5,
  /** Что устройство пришлёт само, если настройку поменяли на нём. */
  twoWay: 0xa6,
  messageTypes: 0xb3,
  /** Чем устройство занято прямо сейчас: тренировка, мониторинг. */
  operator: 0xe5,
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

export const byte = (value: number) => Uint8Array.from([value & 0xff]);
export const word = toBe16;

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
/**
 * Состояние поиска браслета, а не ношения.
 *
 * Имя вендора — `getFindWearState`. Ношение приходит только отчётом
 * `01 E1 AC 11`; команды чтения для него в протоколе нет.
 */
export const readFindState = () => encode(Cmd.system, Mode.read, 0x07);

/** Код языка, на котором сейчас работает прошивка. */
export const readCurrentLanguage = () => encode(Cmd.system, Mode.read, 0x08);

/** Какие языки прошивка вообще знает. На ES100 список пуст. */
export const readSupportedLanguages = () => encode(Cmd.system, Mode.read, 0x03);

/** Автоподсветка экрана. Экрана нет, но флаг прошивка держит и отдаёт. */
export const readScreenAutoLight = () => encode(Cmd.system, Mode.read, 0x06);

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

/**
 * Распознанная устройством активность идёт двумя независимыми потоками.
 * Различие между ними не установлено: в наблюдениях второй попадал внутрь окна
 * тренировки, а первый шёл вне её.
 */
export const readStatusCount = (from: Date, to: Date) =>
  encode(Cmd.historyCount, Mode.read, 0x02, concat(encodeTime(from), encodeTime(to)));

export const readStatusFrame = (from: Date, to: Date, index: number) =>
  encode(Cmd.history, Mode.read, 0x02, concat(encodeTime(from), encodeTime(to), word(index)));

/** Счётчик второго потока: он спрашивается ещё и по типу движения. */
export const readStateCount = (from: Date, to: Date, type = 0) =>
  encode(Cmd.historyCount, Mode.read, 0x03, concat(encodeTime(from), encodeTime(to), byte(type)));

export const readStateFrame = (from: Date, to: Date, index: number) =>
  encode(Cmd.history, Mode.read, 0x03, concat(encodeTime(from), encodeTime(to), word(index)));

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
export const readNotificationLimits = () => encodeReadAll(Cmd.notifications);
export const readWeatherSupport = () => encode(Cmd.weather, Mode.read, 0x01);

/**
 * Сколько будильников держит прошивка. Живьём отвечает `02 0a 1f`, то есть
 * предел известен — подбирать свободный слот вслепую не нужно.
 */
export const readAlarmLimits = () => encode(Cmd.alarms, Mode.read, 0x0a);

/**
 * Двусторонние настройки: список того, о смене чего устройство сообщит само.
 * Без него непонятно, какие изменения прилетят отчётом, а какие надо перечитывать.
 */
export const readTwoWaySettings = () => encode(Cmd.twoWay, Mode.read, 0x01);

/** Какие типы уведомлений различает прошивка. */
export const readNotificationTypes = () => encodeReadAll(Cmd.messageTypes);

/** Идёт ли сейчас тренировка или мониторинг. */
export const readOperatorState = () => encodeReadAll(Cmd.operator);

/**
 * Разрешить устройству докладывать о ходе тренировки.
 *
 * Без этого оно ведёт занятие молча: секундный поток с пульсом и шагами
 * начинается только после этой команды.
 */
export const writeOperatorReport = (on: boolean) =>
  encode(Cmd.workout, Mode.write, 0x02, byte(on ? 1 : 0));

/** Умеет ли устройство тренировки вообще. */
export const readWorkoutSupport = () => encode(Cmd.workout, Mode.read, 0x07);
