import * as cmd from './commands';
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

  setDoNotDisturb(options: Parameters<typeof cmd.writeDoNotDisturb>[0]): Promise<void> {
    return this.transport.send(cmd.writeDoNotDisturb(options));
  }
}
