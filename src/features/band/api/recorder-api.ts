import * as recorder from './recorder';
import type { BandTransport } from './transport';

/** Сколько ждать выгрузку целиком, прежде чем считать её оборванной. */
const DOWNLOAD_TIMEOUT_MS = 120_000;

/**
 * Диктофон: список, выгрузка, управление записью.
 *
 * У подсистемы свой протокол — заголовок из трёх байт и порядок байт младшим
 * вперёд, — поэтому её ответы идут сырым путём мимо сборщика кадров основного
 * протокола.
 */
export class BandRecorder {
  constructor(private readonly transport: BandTransport) {}

  async storage(): Promise<recorder.Storage | null> {
    return recorder.decodeStorage(
      await this.transport.requestRaw(recorder.readStorage(), recorder.Op.storage),
    );
  }

  async list(): Promise<recorder.Recording[]> {
    const body = await this.transport.requestRaw(recorder.listRecordings(), recorder.Op.list);
    return recorder.decodeRecordings(body);
  }

  /** Только последняя запись — так делает приложение вендора. */
  async latest(): Promise<recorder.Recording[]> {
    const body = await this.transport.requestRaw(recorder.listRecordings(true), recorder.Op.list);
    return recorder.decodeRecordings(body);
  }

  start(): Promise<void> {
    return this.transport.send(recorder.startRecording());
  }

  stop(): Promise<void> {
    return this.transport.send(recorder.stopRecording());
  }

  pause(session: number): Promise<void> {
    return this.transport.send(recorder.pauseRecording(session));
  }

  resume(session: number): Promise<void> {
    return this.transport.send(recorder.resumeRecording(session));
  }

  /** Удалить запись с браслета. Вызывать только после сохранения файла. */
  remove(session: number): Promise<void> {
    return this.transport.send(recorder.removeRecording(session));
  }

  /**
   * Метки, поставленные кнопкой во время записи. Раскладка ответа на устройстве
   * не проверена, поэтому пакет отдаётся сырым: живые метки приходят отчётом и
   * разбираются точно, а этот список нужен только после переустановки.
   */
  marks(): Promise<Uint8Array> {
    return this.transport.requestRaw(recorder.listMarks(), recorder.Op.markList);
  }

  /**
   * Скачать запись. Данные идут отдельным потоком кадров, а не ответом на
   * команду, поэтому слушаем их напрямую.
   *
   * Диапазон позволяет продолжить с места обрыва: если фоновое окно закрылось,
   * дозагрузка начинается с `from`, а не с нуля.
   */
  download(
    session: number,
    size: number,
    options: { from?: number; onProgress?: (received: number) => void } = {},
  ): Promise<Uint8Array> {
    const buffer = new recorder.DownloadBuffer(session);

    return new Promise<Uint8Array>((resolve, reject) => {
      const timer = setTimeout(() => {
        stop();
        reject(new Error('браслет прервал выгрузку записи'));
      }, DOWNLOAD_TIMEOUT_MS);

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
}
