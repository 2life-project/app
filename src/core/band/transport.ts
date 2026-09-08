import { BleError, BleErrorCode, type Device, type Subscription } from 'react-native-ble-plx';

import { ble, isReady, waitForRadio } from '@/core/ble';
import { logger } from '@/core/log/logger';

import { byteAt, fromBase64, toBase64 } from './bytes';
import { FrameAssembler, decode } from './frame';
import { BAND_CAPABILITY_SERVICE, BAND_GATT_SERVICE } from './names';

/** Сервис и характеристики рабочего канала браслета. */
const SERVICE = BAND_GATT_SERVICE;
const WRITE = '000034f1-0000-1000-8000-00805f9b34fb';
const NOTIFY = '000034f2-0000-1000-8000-00805f9b34fb';

/** Сервис с масками возможностей: обе характеристики только читаются. */
const CAPABILITY_SERVICE = BAND_CAPABILITY_SERVICE;
const CAPABILITY_LOW = '000035f1-0000-1000-8000-00805f9b34fb';
const CAPABILITY_HIGH = '000034f1-0000-1000-8000-00805f9b34fb';

/**
 * Пауза между записями. Прошивка теряет кадры, если слать их вплотную: в SDK
 * вендора стоит 40 мс, на живом устройстве надёжно работает от 80.
 */
const WRITE_GAP_MS = 80;

/** Сколько ждать ответ. Выгрузка истории и аудио отвечает не мгновенно. */
const REPLY_TIMEOUT_MS = 12_000;

type Waiter = {
  /** Наш ли это ответ. Решается по сырым байтам: у диктофона свой заголовок. */
  matches: (data: Uint8Array) => boolean;
  /** `null` — ответ приходит одним кадром и отдаётся как есть, без сборки. */
  assembler: FrameAssembler | null;
  resolve: (body: Uint8Array) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

/** Слушатель кадров, которые устройство присылает само. */
export type ReportListener = (data: Uint8Array) => void;

/**
 * Транспорт к браслету: одно соединение, одна очередь команд.
 *
 * Очередь нужна не для скорости, а для корректности: устройство отвечает без
 * идентификатора запроса, поэтому два параллельных запроса разобрать нельзя —
 * ответы перепутаются. Команды идут строго по одной.
 */
export class BandTransport {
  private notifications: Subscription | null = null;
  private disconnection: Subscription | null = null;
  private readonly lost = new Set<() => void>();
  /** Связь потеряна: дальше нет смысла ни писать, ни ждать ответа. */
  private gone = false;
  private waiter: Waiter | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private lastWrite = 0;
  private readonly listeners = new Set<ReportListener>();

  constructor(private readonly device: Device) {}

  /** Подписаться на канал уведомлений. Без этого не придёт ни один ответ. */
  /** Узнать о разрыве связи. Без этого экран продолжает слать команды в никуда. */
  onLost(listener: () => void): () => void {
    this.lost.add(listener);
    return () => this.lost.delete(listener);
  }

  async start(): Promise<void> {
    if (this.notifications) return;

    this.disconnection = this.device.onDisconnected(() => this.declareLost());

    this.notifications = this.device.monitorCharacteristicForService(
      SERVICE,
      NOTIFY,
      (error, characteristic) => {
        if (error) {
          logger.warn('band: канал уведомлений закрылся', { reason: error.message });
          this.failWaiter(new Error('соединение с браслетом потеряно'));
          return;
        }
        const value = characteristic?.value;
        if (value) this.dispatch(fromBase64(value));
      },
    );
  }

  async stop(): Promise<void> {
    this.gone = true;
    this.notifications?.remove();
    this.notifications = null;
    this.disconnection?.remove();
    this.disconnection = null;
    this.failWaiter(new Error('транспорт остановлен'));

    // Снять подписку мало: соединение остаётся открытым, браслет считает себя
    // занятым, и в эфире его больше не видно — «отключили» превращается в
    // устройство, которое не найти и не переподключить.
    await this.device.cancelConnection().catch((failure: unknown) => {
      logger.warn('band: соединение не закрылось', { reason: String(failure) });
    });
  }

  /** Кадры, пришедшие без запроса: кнопка, пульс, шаги, готовая запись. */
  onReport(listener: ReportListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Отправить кадр, не дожидаясь ответа. */
  send(frame: Uint8Array): Promise<void> {
    return this.enqueue(() => this.write(frame));
  }

  /**
   * Отправить запрос и дождаться собранного ответа.
   *
   * Совпадение ищем по команде и полю, а не по порядку: пока идёт наш ответ,
   * устройство продолжает слать свои отчёты, и они не должны попасть в тело.
   */
  request(
    frame: Uint8Array,
    expect?: { cmd?: number; mode?: number; field?: number },
  ): Promise<Uint8Array> {
    const cmd = expect?.cmd ?? byteAt(frame, 1);
    const field = expect?.field ?? byteAt(frame, 3);

    // Режим входит в сопоставление наравне с командой и полем: устройство шлёт
    // свои отчёты той же группой и тем же полем, отличаясь только режимом
    // (`ac` против `aa`), и без этой проверки живой отчёт о пульсе попадал бы
    // в середину истории как её кадр.
    const mode = expect?.mode ?? byteAt(frame, 2);

    return this.exchange(
      frame,
      (data) =>
        decode(data) !== null &&
        byteAt(data, 1) === cmd &&
        byteAt(data, 2) === mode &&
        byteAt(data, 3) === field,
      new FrameAssembler(),
      `0x${cmd.toString(16)}/0x${mode.toString(16)}/0x${field.toString(16)}`,
    );
  }

  /**
   * Запрос, ответ на который приходит одним кадром и отдаётся сырым.
   *
   * Так отвечает диктофон: у него свой заголовок `01 OP 00` и порядок байт
   * младшим вперёд — режима и поля основного протокола там нет вовсе. Прогнать
   * такой ответ через сборщик кадров значит ждать терминатор, которого в этом
   * протоколе не бывает, до самого истечения времени.
   */
  requestRaw(frame: Uint8Array, op: number): Promise<Uint8Array> {
    return this.exchange(frame, (data) => byteAt(data, 1) === op, null, `0x${op.toString(16)}`);
  }

  private exchange(
    frame: Uint8Array,
    matches: (data: Uint8Array) => boolean,
    assembler: FrameAssembler | null,
    label: string,
  ): Promise<Uint8Array> {
    return this.enqueue(
      () =>
        new Promise<Uint8Array>((resolve, reject) => {
          const timer = setTimeout(() => {
            this.waiter = null;
            reject(new Error(`браслет не ответил на ${label}`));
          }, REPLY_TIMEOUT_MS);

          this.waiter = { matches, assembler, resolve, reject, timer };

          this.write(frame).catch((error: unknown) => {
            clearTimeout(timer);
            this.waiter = null;
            reject(error instanceof Error ? error : new Error(String(error)));
          });
        }),
    );
  }

  /** Маски возможностей: младшие списки и старшие вместе с размером пакета. */
  async readCapabilities(): Promise<{ low: Uint8Array; high: Uint8Array }> {
    const [low, high] = await Promise.all([
      this.device.readCharacteristicForService(CAPABILITY_SERVICE, CAPABILITY_LOW),
      this.device.readCharacteristicForService(SERVICE, CAPABILITY_HIGH),
    ]);

    return {
      low: fromBase64(low.value ?? ''),
      high: fromBase64(high.value ?? ''),
    };
  }

  private dispatch(data: Uint8Array): void {
    const waiter = this.waiter;
    logger.debug('band <-', { frame: hex(data), matched: waiter?.matches(data) ?? false });

    if (waiter?.matches(data)) {
      clearTimeout(waiter.timer);

      if (!waiter.assembler) {
        this.waiter = null;
        waiter.resolve(data);
        return;
      }

      if (waiter.assembler.push(data)) {
        this.waiter = null;
        if (waiter.assembler.valid) waiter.resolve(waiter.assembler.body());
        else waiter.reject(new Error('ответ браслета не сошёлся по контрольной сумме'));
        return;
      }

      // Кадр принят, ответ ещё не собран: часы дожидания заводим заново, иначе
      // длинная история не успевает доехать за отведённое на один кадр время.
      waiter.timer = setTimeout(() => {
        this.waiter = null;
        waiter.reject(new Error('ответ браслета оборвался на середине'));
      }, REPLY_TIMEOUT_MS);
      return;
    }

    for (const listener of this.listeners) listener(data);
  }

  private failWaiter(error: Error): void {
    const waiter = this.waiter;
    if (!waiter) return;
    clearTimeout(waiter.timer);
    this.waiter = null;
    waiter.reject(error);
  }

  /** Все обращения к радио идут цепочкой, чтобы не спорить за одну очередь. */
  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = this.queue.then(task, task);
    // Ошибка одной команды не должна рвать очередь для следующих.
    this.queue = result.catch(() => undefined);
    return result;
  }

  private async write(frame: Uint8Array): Promise<void> {
    // Раз связи нет, остальные команды пачки отвечать не начнут: без этой
    // проверки одно обновление данных давало семь одинаковых отказов подряд —
    // по строке на каждый показатель.
    if (this.gone) throw new Error('связь с браслетом потеряна');

    const since = Date.now() - this.lastWrite;
    if (since < WRITE_GAP_MS) await delay(WRITE_GAP_MS - since);

    logger.debug('band ->', { frame: hex(frame) });
    try {
      await this.device.writeCharacteristicWithoutResponseForService(
        SERVICE,
        WRITE,
        toBase64(frame),
      );
    } catch (failure) {
      // Отказ «устройство не подключено» — приговор сеансу, а не одной команде.
      // Через эту запись проходит каждая команда, поэтому связь объявляется
      // потерянной здесь: иначе экран остаётся «подключённым», а всё, что на
      // нём нажимают, молча уходит в закрытое соединение.
      if (isLostConnection(failure)) this.declareLost();
      throw failure;
    }
    this.lastWrite = Date.now();
  }

  private declareLost(): void {
    if (this.gone) return;
    this.gone = true;
    this.failWaiter(new Error('связь с браслетом потеряна'));
    for (const listener of this.lost) listener();
  }
}

/** Ошибка означает, что связи больше нет, а не что команда не удалась. */
function isLostConnection(failure: unknown): boolean {
  if (!(failure instanceof BleError)) return false;
  return (
    failure.errorCode === BleErrorCode.DeviceNotConnected ||
    failure.errorCode === BleErrorCode.DeviceDisconnected
  );
}

function hex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join(' ');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Подключиться к устройству и договориться о размере пакета. */
export async function connectTransport(deviceId: string): Promise<BandTransport> {
  const manager = ble();

  // Сразу после запуска приложения состояние радио — `Unknown`: система ещё не
  // ответила. Подключаться в этот момент бессмысленно, и именно так падало
  // автоподключение к запомненному браслету на каждом холодном старте.
  const state = await waitForRadio();
  if (!isReady(state)) throw new Error(`band: Bluetooth недоступен (${state})`);

  // Браслет мог быть подключён и без нас: другим экраном или приложением
  // вендора. Соединение системное и общее, но `connectToDevice` на уже
  // открытом падает — тогда просто берём устройство из известных.
  const device = await manager
    .connectToDevice(deviceId, { requestMTU: 247 })
    .catch(async (failure: unknown) => {
      if (
        !(failure instanceof BleError) ||
        failure.errorCode !== BleErrorCode.DeviceAlreadyConnected
      ) {
        throw failure;
      }
      return (await manager.devices([deviceId]))[0];
    });
  if (!device) throw new Error(`band: устройство ${deviceId} потерялось при подключении`);

  await device.discoverAllServicesAndCharacteristics();
  await describe(device);

  const transport = new BandTransport(device);
  await transport.start();
  return transport;
}

/**
 * Разорвать связь с браслетом, когда транспорта на руках нет.
 *
 * Нужна отдельно от `stop`: связь мог держать другой экран или прошлый запуск,
 * а отвязать устройство надо и в этом случае.
 */
export async function dropConnection(deviceId: string): Promise<void> {
  await ble()
    .cancelDeviceConnection(deviceId)
    .catch((failure: unknown) => {
      logger.warn('band: связь не разорвалась', { deviceId, reason: String(failure) });
    });
}

/**
 * Что у устройства на самом деле есть. Без этого молчащий канал неотличим от
 * молчащего браслета: обе картины выглядят как «команда не ответила».
 */
async function describe(device: Device): Promise<void> {
  const services = await device.services();
  for (const service of services) {
    const characteristics = await service.characteristics();
    logger.debug('band gatt', {
      service: service.uuid,
      characteristics: characteristics.map((item) => ({
        uuid: item.uuid,
        notify: item.isNotifiable,
        indicate: item.isIndicatable,
        write: item.isWritableWithResponse,
        writeNoResponse: item.isWritableWithoutResponse,
      })),
    });
  }
}
