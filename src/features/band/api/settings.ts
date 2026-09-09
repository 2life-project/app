import * as cmd from './commands';
import * as health from './commands-health';
import { autoStress, motionGoal, userProfile, type MotionGoal, type UserProfile } from './profile';
import { intField, parseModal } from './tlv';
import type { BandTransport } from './transport';

/**
 * Настройки устройства: чтение и запись.
 *
 * Браслет хранит их у себя и переживает с ними перезагрузку телефона. Читать
 * перед показом обязательно: приложение не знает, что человек менял с другого
 * телефона или в программе вендора.
 */

/** Порог с тревогой: браслет завибрирует, когда пульс выйдет за него. */
export type Threshold = { enabled: boolean; bpm: number };

export type DeviceSettings = {
  /** Код языка прошивки. У ES100 экрана нет, но поле общее на линейку. */
  language?: number;
  /** Автоподсветка экрана: флаг прошивка держит и на устройстве без экрана. */
  screenAutoLight?: boolean;
  /** Метрические единицы длины: иначе мили. */
  metricLength?: boolean;
  /** Секунды до гашения экрана. На устройстве без экрана ни на что не влияет. */
  screenTimeout?: number;
  /** Раз во сколько минут мерить пульс. */
  heartRateInterval?: number;
  oxygenInterval?: number;
  continuousHeartRate?: boolean;
  continuousOxygen?: boolean;
  heartRateHighLimit?: Threshold;
  heartRateLowLimit?: Threshold;
  /** Тревога по низкому кислороду: включённость и порог в процентах. */
  oxygenLowLimit?: { enabled: boolean; percent: number };
  /**
   * Замеры, которые браслет делает сам, без просьбы приложения. На живом
   * устройстве все три включены с завода — не читая их, мы не знаем, откуда
   * взялись показания, которые уже разбираем.
   */
  autoStress?: boolean;
  autoMood?: boolean;
  autoBloodPressure?: boolean;
  stressInterval?: number;
  moodInterval?: number;
  bloodPressureInterval?: number;
};

export type DoNotDisturb = {
  allDay: boolean;
  scheduled: boolean;
  from: { hour: number; minute: number };
  to: { hour: number; minute: number };
  muteVibration: boolean;
  muteMessages: boolean;
};

/** Значение поля из ответа. Ответ на чтение одного поля несёт ровно его. */
function value(body: Uint8Array, field: number): number | undefined {
  return intField(parseModal(body), field);
}

function raw(body: Uint8Array, field: number): Uint8Array | undefined {
  return parseModal(body).find((item) => item.tag === field)?.value;
}

function threshold(body: Uint8Array, field: number): Threshold | undefined {
  const bytes = raw(body, field);
  if (!bytes || bytes.length < 2) return undefined;
  return { enabled: bytes[0] === 1, bpm: bytes[1] ?? 0 };
}

export function decodeDoNotDisturb(body: Uint8Array): DoNotDisturb | null {
  const bytes = raw(body, 0x01);
  if (!bytes || bytes.length < 8) return null;

  return {
    allDay: bytes[0] === 1,
    scheduled: bytes[1] === 1,
    from: { hour: bytes[2] ?? 0, minute: bytes[3] ?? 0 },
    to: { hour: bytes[4] ?? 0, minute: bytes[5] ?? 0 },
    muteVibration: bytes[6] === 1,
    muteMessages: bytes[7] === 1,
  };
}

export class BandSettings {
  constructor(private readonly transport: BandTransport) {}

  /**
   * Прочитать всё разом. Запросы идут по одному: устройство отвечает без
   * идентификатора запроса, и параллельные чтения перепутались бы ответами.
   */
  async read(): Promise<DeviceSettings> {
    const settings: DeviceSettings = {
      language: value(await this.transport.request(cmd.readLanguage()), 0x08),
      screenTimeout: value(await this.transport.request(cmd.readScreenTimeout()), 0x09),
      heartRateInterval: value(await this.transport.request(cmd.readHeartRateInterval()), 0x0b),
      oxygenInterval: value(await this.transport.request(cmd.readOxygenInterval()), 0x0c),
      heartRateHighLimit: threshold(
        await this.transport.request(cmd.readHeartRateHighLimit()),
        0x15,
      ),
      heartRateLowLimit: threshold(await this.transport.request(cmd.readHeartRateLowLimit()), 0x16),
    };

    const units = value(await this.transport.request(cmd.readLengthUnits()), 0x04);
    if (units !== undefined) settings.metricLength = units === 0;

    const heart = value(await this.transport.request(cmd.readContinuousHeartRate()), 0x10);
    if (heart !== undefined) settings.continuousHeartRate = heart === 1;

    const oxygen = value(await this.transport.request(cmd.readContinuousOxygen()), 0x11);
    if (oxygen !== undefined) settings.continuousOxygen = oxygen === 1;

    const stress = value(await this.transport.request(health.readAutoStress()), 0x12);
    if (stress !== undefined) settings.autoStress = stress === 1;

    const mood = value(await this.transport.request(health.readAutoMood()), 0x13);
    if (mood !== undefined) settings.autoMood = mood === 1;

    const pressure = value(await this.transport.request(health.readAutoBloodPressure()), 0x14);
    if (pressure !== undefined) settings.autoBloodPressure = pressure === 1;

    settings.stressInterval = value(
      await this.transport.request(health.readStressInterval()),
      0x0d,
    );
    settings.moodInterval = value(await this.transport.request(health.readMoodInterval()), 0x0e);
    settings.bloodPressureInterval = value(
      await this.transport.request(health.readBloodPressureInterval()),
      0x0f,
    );

    const low = raw(await this.transport.request(health.readOxygenLowLimit()), 0x03);
    if (low && low.length >= 2) {
      settings.oxygenLowLimit = { enabled: low[0] === 1, percent: low[1] ?? 0 };
    }

    return settings;
  }

  async doNotDisturb(): Promise<DoNotDisturb | null> {
    return decodeDoNotDisturb(await this.transport.request(cmd.readDoNotDisturb()));
  }

  setLanguage(code: number): Promise<void> {
    return this.transport.send(cmd.writeLanguage(code));
  }

  setLengthUnits(metric: boolean): Promise<void> {
    return this.transport.send(cmd.writeLengthUnits(metric));
  }

  setWeightUnits(metric: boolean): Promise<void> {
    return this.transport.send(cmd.writeWeightUnits(metric));
  }

  setScreenTimeout(seconds: number): Promise<void> {
    return this.transport.send(cmd.writeScreenTimeout(seconds));
  }

  /** Мерить пульс самостоятельно по расписанию. */
  setAutoHeartRate(on: boolean): Promise<void> {
    return this.transport.send(cmd.writeAutoHeartRate(on));
  }

  /** Непрерывный пульс. Ест батарею заметно быстрее расписания. */
  setContinuousHeartRate(on: boolean): Promise<void> {
    return this.transport.send(cmd.writeContinuousHeartRate(on));
  }

  setHeartRateInterval(minutes: number): Promise<void> {
    return this.transport.send(cmd.writeHeartRateInterval(minutes));
  }

  setOxygenInterval(minutes: number): Promise<void> {
    return this.transport.send(cmd.writeOxygenInterval(minutes));
  }

  setHeartRateHighLimit(enabled: boolean, bpm: number): Promise<void> {
    return this.transport.send(cmd.writeHeartRateHighLimit(enabled, bpm));
  }

  setHeartRateLowLimit(enabled: boolean, bpm: number): Promise<void> {
    return this.transport.send(cmd.writeHeartRateLowLimit(enabled, bpm));
  }

  setDoNotDisturb(options: Parameters<typeof health.writeDoNotDisturb>[0]): Promise<void> {
    return this.transport.send(health.writeDoNotDisturb(options));
  }

  /** Непрерывный кислород. Читается из health, а пишется в группу напоминаний. */
  setContinuousOxygen(on: boolean): Promise<void> {
    return this.transport.send(health.writeContinuousOxygen(on));
  }

  setOxygenLowLimit(enabled: boolean, percent: number): Promise<void> {
    return this.transport.send(health.writeOxygenLowLimit(enabled, percent));
  }

  setAutoMood(on: boolean): Promise<void> {
    return this.transport.send(health.writeAutoMood(on));
  }

  setAutoBloodPressure(on: boolean): Promise<void> {
    return this.transport.send(health.writeAutoBloodPressure(on));
  }

  setMoodInterval(minutes: number): Promise<void> {
    return this.transport.send(health.writeMoodInterval(minutes));
  }

  setBloodPressureInterval(minutes: number): Promise<void> {
    return this.transport.send(health.writeBloodPressureInterval(minutes));
  }

  setBloodPressureUnit(unit: number): Promise<void> {
    return this.transport.send(health.writeBloodPressureUnit(unit));
  }

  /**
   * Автозамер стресса. Читается полем `0x12`, пишется парой `0x07` и `0x0D` —
   * поля разные, и одно из другого не выводится.
   */
  async setAutoStress(enabled: boolean, intervalMinutes: number): Promise<void> {
    for (const frame of autoStress(enabled, intervalMinutes)) await this.transport.send(frame);
  }

  /**
   * Профиль на устройство: рост, вес, возраст, длина шага.
   *
   * Отправлять его надо при привязке. Без этого браслет считает дистанцию и
   * калории по заводским значениям, а приложение читает результат как
   * измеренный факт — систематическая ошибка уходит во все производные числа.
   */
  async setProfile(profile: UserProfile): Promise<void> {
    for (const frame of userProfile(profile)) await this.transport.send(frame);
  }

  /** Дневная цель на самом устройстве, а не только в приложении. */
  async setGoal(goal: MotionGoal): Promise<void> {
    for (const frame of motionGoal(goal)) await this.transport.send(frame);
  }

  /** Зоны пульса на устройстве: иначе оно и приложение считают зону по-разному. */
  setHeartRateZones(zones: Parameters<typeof health.writeHeartRateZones>[0]): Promise<void> {
    return this.transport.send(health.writeHeartRateZones(zones));
  }

  twoWaySettings(): Promise<Uint8Array> {
    return this.transport.request(cmd.readTwoWaySettings());
  }
}
