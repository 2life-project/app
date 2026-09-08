import { Buffer } from 'buffer';

import type { Device, Subscription } from 'react-native-ble-plx';

import { ble } from '@/core/ble';
import { logger } from '@/core/log/logger';

import { byteAt } from './bytes';
import { FrameAssembler, decode } from './frame';

/** Сервис и характеристики рабочего канала браслета. */
const SERVICE = '000056ff-0000-1000-8000-00805f9b34fb';
const WRITE = '000034f1-0000-1000-8000-00805f9b34fb';
const NOTIFY = '000034f2-0000-1000-8000-00805f9b34fb';

/** Сервис с масками возможностей: обе характеристики только читаются. */
const CAPABILITY_SERVICE = '000055ff-0000-1000-8000-00805f9b34fb';
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
  matches: (cmd: number, field: number) => boolean;
  assembler: FrameAssembler;
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
  private waiter: Waiter | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private lastWrite = 0;
  private readonly listeners = new Set<ReportListener>();

  constructor(private readonly device: Device) {}

  /** Подписаться на канал уведомлений. Без этого не придёт ни один ответ. */
  async start(): Promise<void> {
    if (this.notifications) return;

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
        if (value) this.dispatch(Uint8Array.from(Buffer.from(value, 'base64')));
      },
    );
  }

  async stop(): Promise<void> {
    this.notifications?.remove();
    this.notifications = null;
    this.failWaiter(new Error('транспорт остановлен'));
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
  request(frame: Uint8Array, expect?: { cmd?: number; field?: number }): Promise<Uint8Array> {
    const cmd = expect?.cmd ?? byteAt(frame, 1);
    const field = expect?.field ?? byteAt(frame, 3);

    return this.enqueue(
      () =>
        new Promise<Uint8Array>((resolve, reject) => {
          const timer = setTimeout(() => {
            this.waiter = null;
            reject(
              new Error(`браслет не ответил на 0x${cmd.toString(16)}/0x${field.toString(16)}`),
            );
          }, REPLY_TIMEOUT_MS);

          this.waiter = {
            matches: (frameCmd, frameField) => frameCmd === cmd && frameField === field,
            assembler: new FrameAssembler(),
            resolve,
            reject,
            timer,
          };

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
      low: Uint8Array.from(Buffer.from(low.value ?? '', 'base64')),
      high: Uint8Array.from(Buffer.from(high.value ?? '', 'base64')),
    };
  }

  private dispatch(data: Uint8Array): void {
    const frame = decode(data);
    const waiter = this.waiter;

    if (frame && waiter?.matches(frame.cmd, frame.field)) {
      if (waiter.assembler.push(data)) {
        clearTimeout(waiter.timer);
        this.waiter = null;
        if (waiter.assembler.valid) waiter.resolve(waiter.assembler.body());
        else waiter.reject(new Error('ответ браслета не сошёлся по контрольной сумме'));
      }
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
    const since = Date.now() - this.lastWrite;
    if (since < WRITE_GAP_MS) await delay(WRITE_GAP_MS - since);

    await this.device.writeCharacteristicWithoutResponseForService(
      SERVICE,
      WRITE,
      Buffer.from(frame).toString('base64'),
    );
    this.lastWrite = Date.now();
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Подключиться к устройству и договориться о размере пакета. */
export async function connectTransport(deviceId: string): Promise<BandTransport> {
  const device = await ble().connectToDevice(deviceId, { requestMTU: 247 });
  await device.discoverAllServicesAndCharacteristics();

  const transport = new BandTransport(device);
  await transport.start();
  return transport;
}
