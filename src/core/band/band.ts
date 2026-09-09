import { logger } from '@/core/log/logger';

import { type ActivitySample, decodeActivityFrame, decodeLiveSample } from './activity';
import { BandAdmin } from './admin';
import { BandAlarms } from './alarms';
import { byteAt } from './bytes';
import * as cmd from './commands';
import {
  type Capabilities,
  type DeviceInfo,
  decodeBattery,
  decodeCapabilities,
  decodeDeviceInfo,
  decodeTime,
} from './device';
import { Mode } from './frame';
import {
  type DaySummary,
  type Measurement,
  type StressSample,
  decodeDaySummary,
  decodeMeasurement,
  decodeSleep,
  decodeStress,
  decodeWearState,
} from './health';
import { BandNotifications } from './notifications';
import * as recorder from './recorder';
import { BandRecorder } from './recorder-api';
import { BandSettings } from './settings';
import { type SleepSession, groupSleep } from './sleep';
import { type BandTransport, connectTransport } from './transport';
import { BandWorkouts } from './workouts';

/**
 * Потолок кадров истории за один запрос. Сутки по минутам не дают больше сотни
 * кадров, и всё, что выше, — испорченный ответ, а не длинный день.
 */
const MAX_HISTORY_FRAMES = 120;

/** Отчёты, которые устройство присылает само. */
export type BandEvent =
  | { kind: 'activity'; sample: ActivitySample }
  | { kind: 'measurement'; measurement: Measurement }
  | { kind: 'wear'; worn: boolean; at: Date }
  | { kind: 'recorder'; event: recorder.RecorderEvent }
  | { kind: 'disconnected' };

export type BandListener = (event: BandEvent) => void;

/**
 * Браслет целиком: соединение, команды и подписка на его собственные отчёты.
 *
 * Устройство держит ровно одно подключение. Пока приложение занимает его,
 * фирменная программа вендора браслет не увидит, и наоборот.
 */
export class Band {
  private readonly listeners = new Set<BandListener>();
  private capabilities: Capabilities | null = null;
  private skew: number | null = null;
  private readonly openedAt = new Date();

  /**
   * Разделы устройства отдельными входами. Плоский фасад на сорок методов
   * читается как свалка: «сохранить будильник» и «стереть все записи» стоят в
   * нём рядом и различаются только именем.
   */
  readonly settings: BandSettings;
  readonly alarms: BandAlarms;
  readonly notifications: BandNotifications;
  readonly recorder: BandRecorder;
  readonly workouts: BandWorkouts;
  /** Необратимое: отвязка, пароль, заводской сброс. */
  readonly admin: BandAdmin;

  private constructor(private readonly transport: BandTransport) {
    this.settings = new BandSettings(transport);
    this.alarms = new BandAlarms(transport);
    this.notifications = new BandNotifications(transport);
    this.recorder = new BandRecorder(transport);
    this.workouts = new BandWorkouts(transport);
    this.admin = new BandAdmin(transport);

    this.transport.onReport((data) => this.handleReport(data));
    this.transport.onLost(() => this.emit({ kind: 'disconnected' }));
  }

  /**
   * Подключиться и привести устройство в рабочее состояние.
   *
   * Время ставится сразу и всегда: браслет теряет часы при разрыве связи, а
   * время старта записи служит её идентификатором. С отставшими часами записи и
   * история встают не в те даты, и это уже не исправить задним числом.
   */
  static async connect(deviceId: string): Promise<Band> {
    const transport = await connectTransport(deviceId);
    const band = new Band(transport);

    // Часы читаем ДО того, как выставим свои: после синхронизации расхождение
    // исчезает, а это единственный факт, объясняющий сдвинутые даты в истории.
    // Стоит он одного запроса.
    await band.measureClockSkew();
    await band.syncTime();
    await band.loadCapabilities();

    return band;
  }

  /**
   * На сколько секунд часы браслета отставали от телефона в момент подключения.
   * Положительное значение — устройство спешило.
   */
  get clockSkewSeconds(): number | null {
    return this.skew;
  }

  /** Когда открылось это соединение: вне него отчёты устройства не приходят. */
  get connectedAt(): Date {
    return this.openedAt;
  }

  private async measureClockSkew(): Promise<void> {
    try {
      const onDevice = await this.deviceTime();
      if (onDevice) this.skew = Math.round((onDevice.getTime() - Date.now()) / 1000);
    } catch (error) {
      logger.warn('band: часы устройства не прочитались', { reason: String(error) });
    }
  }

  async disconnect(): Promise<void> {
    await this.transport.stop();
  }

  /** Подписаться на отчёты устройства. Возвращает функцию отписки. */
  subscribe(listener: BandListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // ------------------------------------------------------------- устройство

  async info(): Promise<DeviceInfo> {
    return decodeDeviceInfo(await this.transport.request(cmd.readDeviceInfo()));
  }

  async battery(): Promise<number> {
    return decodeBattery(await this.transport.request(cmd.readBattery())).level;
  }

  async deviceTime(): Promise<Date | undefined> {
    return decodeTime(await this.transport.request(cmd.readTime(), { field: 0xaa }));
  }

  async syncTime(): Promise<void> {
    await this.transport.send(cmd.writeTime(new Date()));
  }

  /** Что устройство умеет. Читается один раз при подключении. */
  async loadCapabilities(): Promise<Capabilities> {
    const { low, high } = await this.transport.readCapabilities();
    this.capabilities = decodeCapabilities(low, high);
    return this.capabilities;
  }

  get features(): Capabilities | null {
    return this.capabilities;
  }

  /** Надет ли браслет прямо сейчас. Тем же полем приходит и самостоятельный отчёт. */
  async worn(): Promise<boolean | undefined> {
    return decodeWearState(await this.transport.request(cmd.readWearState()))?.worn;
  }

  /** Вибрация: единственный способ позвать браслет без экрана. */
  async find(on: boolean): Promise<void> {
    await this.transport.send(cmd.findBand(on));
  }

  // ---------------------------------------------------------------- здоровье

  async daySummary(): Promise<DaySummary> {
    return decodeDaySummary(
      await this.transport.request(cmd.readDaySummary(), { field: Mode.read }),
    );
  }

  /**
   * Запустить разовый замер. Результат придёт отчётом примерно через минуту:
   * оптический датчик включается на измерение, а не работает постоянно.
   */
  async measure(): Promise<void> {
    await this.transport.send(cmd.measureOnce());
  }

  /**
   * Живой пульс. Устройство начнёт присылать его вместе с шагами каждые десять
   * секунд, но само значение обновляется не чаще, чем идёт замер.
   */
  async watchHeartRate(intervalMinutes = 1): Promise<void> {
    await this.transport.send(cmd.writeContinuousHeartRate(true));
    await this.transport.send(cmd.writeHeartRateInterval(intervalMinutes));
  }

  /**
   * Сон сессиями. Границы ставит само устройство маркерами — эвристике по
   * разрыву во времени здесь верить незачем, когда есть прямой признак.
   */
  async sleep(from: Date, to: Date): Promise<SleepSession[]> {
    return groupSleep(decodeSleep(await this.transport.request(cmd.readSleep(from, to))));
  }

  async stress(from: Date, to: Date): Promise<StressSample[]> {
    return decodeStress(await this.transport.request(cmd.readStress(from, to)));
  }

  /**
   * Поминутная история за период. Устройство отдаёт её кадрами, поэтому сначала
   * спрашиваем их количество, потом забираем по одному.
   */
  async history(from: Date, to: Date): Promise<ActivitySample[]> {
    // Счётчик отвечает одним коротким кадром без терминатора — сборщик
    // многокадровых ответов ждал бы его до истечения времени.
    const countBody = await this.transport.requestRaw(cmd.readActivityCount(from, to), 0xc5);
    const declared = countBody.length > 0 ? byteAt(countBody, countBody.length - 1) : 0;

    // Кадров не бывает больше суток по минутам, а число приходит одним байтом:
    // сбитый ответ превращается в две с половиной сотни запросов по двенадцать
    // секунд каждый — раздел на такое время просто перестаёт отвечать.
    const frames = Math.min(declared, MAX_HISTORY_FRAMES);
    if (declared > frames) {
      logger.warn('band: устройство заявило слишком много кадров', { declared });
    }

    const samples: ActivitySample[] = [];
    for (let index = 0; index < frames; index += 1) {
      try {
        const body = await this.transport.request(cmd.readActivityFrame(from, to, index));
        samples.push(...decodeActivityFrame(body).samples);
      } catch (error) {
        // Один потерянный кадр не повод бросать всю выгрузку: остальные дни
        // важнее, а пропуск виден по разрыву во времени.
        logger.warn('band: кадр истории не пришёл', { index, reason: String(error) });
      }
    }

    return samples;
  }

  // ------------------------------------------------------------------ отчёты

  private handleReport(data: Uint8Array): void {
    const recorderEvent = recorder.decodeRecorderEvent(data);
    if (recorderEvent) {
      this.emit({ kind: 'recorder', event: recorderEvent });
      return;
    }

    if (byteAt(data, 0) !== 0x01 || byteAt(data, 2) !== Mode.report) return;

    if (byteAt(data, 1) === 0xc6 && byteAt(data, 3) === 0x01) {
      const sample = decodeLiveSample(data);
      if (sample) this.emit({ kind: 'activity', sample });
      return;
    }

    if (byteAt(data, 1) === 0xe1 && byteAt(data, 3) === 0x12) {
      const measurement = decodeMeasurement(data);
      if (measurement) this.emit({ kind: 'measurement', measurement });
      return;
    }

    if (byteAt(data, 1) === 0xe1 && byteAt(data, 3) === 0x11) {
      const wear = decodeWearState(data);
      if (wear) this.emit({ kind: 'wear', worn: wear.worn, at: wear.at });
    }
  }

  private emit(event: BandEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}
