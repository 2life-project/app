import { logger } from '@/core/log/logger';

import { type ActivitySample, decodeActivityFrame, decodeLiveSample } from './activity';
import { byteAt } from './bytes';
import * as cmd from './commands';
import * as danger from './danger';
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
  type SleepSegment,
  type StressSample,
  decodeDaySummary,
  decodeMeasurement,
  decodeSleep,
  decodeStress,
  decodeWearState,
} from './health';
import * as recorder from './recorder';
import { type BandTransport, connectTransport } from './transport';

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

  private constructor(private readonly transport: BandTransport) {
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

    await band.syncTime();
    await band.loadCapabilities();

    return band;
  }

  async disconnect(): Promise<void> {
    await this.transport.stop();
  }

  /**
   * Снять привязку на самом браслете: он забывает аккаунт и снова доступен
   * другому телефону. Без этого «забыть» стирает память только у приложения, а
   * устройство продолжает считать себя занятым.
   */
  async unbind(): Promise<void> {
    await this.transport.send(danger.unbind());
    await this.transport.send(danger.clearAccount());
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

  async sleep(from: Date, to: Date): Promise<SleepSegment[]> {
    return decodeSleep(await this.transport.request(cmd.readSleep(from, to)));
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

  // ---------------------------------------------------------------- диктофон

  async storage(): Promise<recorder.Storage | null> {
    return recorder.decodeStorage(
      await this.transport.requestRaw(recorder.readStorage(), recorder.Op.storage),
    );
  }

  async recordings(): Promise<recorder.Recording[]> {
    const body = await this.transport.requestRaw(recorder.listRecordings(), recorder.Op.list);
    return recorder.decodeRecordings(body);
  }

  async startRecording(): Promise<void> {
    await this.transport.send(recorder.startRecording());
  }

  async stopRecording(): Promise<void> {
    await this.transport.send(recorder.stopRecording());
  }

  /**
   * Скачать запись. Данные идут отдельным потоком кадров, а не ответом на
   * команду, поэтому слушаем их напрямую.
   *
   * Диапазон позволяет продолжить с места обрыва: если фоновое окно закрылось,
   * дозагрузка начинается с `from`, а не с нуля.
   */
  async downloadRecording(
    session: number,
    size: number,
    options: { from?: number; onProgress?: (received: number) => void } = {},
  ): Promise<Uint8Array> {
    const buffer = new recorder.DownloadBuffer(session);

    return new Promise<Uint8Array>((resolve, reject) => {
      const timer = setTimeout(() => {
        stop();
        reject(new Error('браслет прервал выгрузку записи'));
      }, 120_000);

      const unsubscribe = this.transport.onReport((data) => {
        if (!buffer.push(data)) {
          options.onProgress?.(buffer.received);
          return;
        }
        stop();
        resolve(buffer.data());
      });

      const stop = () => {
        clearTimeout(timer);
        unsubscribe();
        void this.transport.send(recorder.cancelDownload());
      };

      this.transport
        .send(recorder.downloadRange(session, options.from ?? 0, size))
        .catch((error: unknown) => {
          stop();
          reject(error instanceof Error ? error : new Error(String(error)));
        });
    });
  }

  /** Удалить запись с браслета. Вызывать только после сохранения файла. */
  async removeRecording(session: number): Promise<void> {
    await this.transport.send(recorder.removeRecording(session));
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
