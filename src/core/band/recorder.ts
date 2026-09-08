import { byteAt, le16, le32, toLe32 } from './bytes';
/**
 * Диктофон браслета.
 *
 * Это отдельная подсистема со своими правилами: кадры вида `01 XX 00`, порядок
 * байт — младшим вперёд, в отличие от основного протокола. Путать нельзя:
 * перепутанный порядок даёт правдоподобные, но неверные идентификаторы записей.
 */

const RECORDER = 0x01;

export const Op = {
  handshake: 0x01,
  serial: 0x02,
  storage: 0x06,
  start: 0x14,
  pause: 0x15,
  resume: 0x16,
  stop: 0x17,
  startAck: 0x18,
  list: 0x1a,
  download: 0x1c,
  cancelDownload: 0x1d,
  remove: 0x1e,
  markList: 0x24,
  markSync: 0x26,
  markCancel: 0x28,
  markRemove: 0x29,
  mark: 0x0d,
} as const;

/** Первый байт потока данных записи. Метки идут отдельным каналом. */
const AUDIO_STREAM = 0x02;
const MARK_STREAM = 0x05;

/** Конец файла: позиция, которой не может быть у настоящего куска. */
const END_OF_FILE = 0xffffffff;

/** Устройство пишет ровно две тысячи байт в секунду. */
export const BYTES_PER_SECOND = 2000;

const u32 = toLe32;

const readU32 = (data: Uint8Array, offset: number) => le32(data, offset) ?? 0;

function frame(op: number, payload?: Uint8Array): Uint8Array {
  if (!payload) return Uint8Array.from([RECORDER, op, 0x00]);
  const out = new Uint8Array(3 + payload.length);
  out.set([RECORDER, op, 0x00]);
  out.set(payload, 3);
  return out;
}

// ------------------------------------------------------------------ команды

/**
 * Рукопожатие. Приложение вендора его не делает вообще, список и выгрузка
 * работают и без него, но короткий ответ несёт настройки микрофона.
 */
export function handshake(token: string): Uint8Array {
  const payload = new Uint8Array(19);
  payload.set([0x02, 0x01, 0x01]);
  const bytes = new TextEncoder().encode(token);
  payload.set(bytes.subarray(0, 16), 3);
  return frame(Op.handshake, payload);
}

export const readStorage = () => frame(Op.storage);
export const readSerial = () => frame(Op.serial);
export const startRecording = () => frame(Op.start);
export const stopRecording = () => frame(Op.stop);
export const pauseRecording = (session: number) => frame(Op.pause, u32(session));
export const resumeRecording = (session: number) =>
  frame(Op.resume, new Uint8Array([...u32(session), 0]));
export const cancelDownload = () => frame(Op.cancelDownload);
export const listMarks = () => frame(Op.markList, new Uint8Array([...u32(0), ...u32(0), 0]));

/** `onlyOne` просит только последнюю запись — так делает приложение вендора. */
export const listRecordings = (onlyOne = false) =>
  frame(Op.list, new Uint8Array([...u32(0), ...u32(0), onlyOne ? 1 : 0]));

/** Выгрузка идёт диапазоном байт, поэтому докачка после обрыва штатная. */
export const downloadRange = (session: number, from: number, to: number, type = 1) =>
  frame(
    Op.download,
    new Uint8Array([...u32(session), ...u32(from), ...u32(to), type & 0xff, (type >> 8) & 0xff]),
  );

/** Удаление освобождает память браслета — вызывать только после сохранения файла. */
export const removeRecording = (session: number, type = 1) =>
  frame(Op.remove, new Uint8Array([...u32(session), type & 0xff, (type >> 8) & 0xff]));

// ------------------------------------------------------------------ разбор

export type Recording = {
  /** Время начала записи; оно же её идентификатор. */
  session: number;
  startedAt: Date;
  bytes: number;
  seconds: number;
  type: number;
};

export function decodeRecordings(frameData: Uint8Array): Recording[] {
  if (frameData.length < 11) return [];

  const count = readU32(frameData, 7);
  const items: Recording[] = [];

  for (
    let index = 0, offset = 11;
    index < count && offset + 10 <= frameData.length;
    index += 1, offset += 10
  ) {
    const session = readU32(frameData, offset);
    const bytes = readU32(frameData, offset + 4);
    items.push({
      session,
      startedAt: new Date(session * 1000),
      bytes,
      seconds: bytes / BYTES_PER_SECOND,
      type: le16(frameData, offset + 8) ?? 0,
    });
  }

  return items;
}

export type Storage = {
  /** Килобайты. */
  total: number;
  free: number;
  /** Сколько байт занимает секунда записи по мнению прошивки. */
  bytesPerSecond: number;
};

export function decodeStorage(frameData: Uint8Array): Storage | null {
  if (frameData.length < 15) return null;

  return {
    total: readU32(frameData, 3),
    free: readU32(frameData, 7),
    bytesPerSecond: readU32(frameData, 11),
  };
}

export type RecorderEvent =
  | { kind: 'started'; session: number }
  | { kind: 'paused'; session: number }
  | { kind: 'resumed'; session: number }
  | { kind: 'finished'; session: number; bytes: number; byButton: boolean }
  | { kind: 'marked'; session: number; offsetSeconds: number; index: number };

/**
 * События диктофона приходят сами, опрашивать устройство не нужно. В кадре
 * остановки лежит готовый размер файла — по нему сразу понятно, сколько качать.
 */
export function decodeRecorderEvent(data: Uint8Array): RecorderEvent | null {
  if (data.length < 7 || byteAt(data, 0) !== RECORDER || byteAt(data, 2) !== 0x00) return null;

  const session = readU32(data, 3);

  switch (byteAt(data, 1)) {
    case Op.start:
    case Op.startAck:
      return { kind: 'started', session };
    case Op.pause:
      return { kind: 'paused', session };
    case Op.resume:
      return { kind: 'resumed', session };
    case Op.stop:
      if (data.length < 13) return null;
      // Байт источника остановки: единица означает «нажали кнопку на браслете».
      return {
        kind: 'finished',
        session,
        bytes: readU32(data, 9),
        byButton: byteAt(data, 7) === 1,
      };
    case Op.mark:
      if (data.length < 13) return null;
      return {
        kind: 'marked',
        session,
        offsetSeconds: readU32(data, 7),
        index: le16(data, 11) ?? 0,
      };
    default:
      return null;
  }
}

/**
 * Накопитель файла. Куски приходят с позицией в файле, а не по порядку, поэтому
 * собираем по позиции — при повторе куска он просто перезапишет сам себя.
 */
export class DownloadBuffer {
  private readonly chunks = new Map<number, Uint8Array>();
  private finished = false;

  constructor(private readonly session: number) {}

  /** Принять кадр. Возвращает true, когда устройство отметило конец файла. */
  push(data: Uint8Array): boolean {
    if (data.length < 10) return false;
    const stream = byteAt(data, 0);
    if (stream !== AUDIO_STREAM && stream !== MARK_STREAM) return false;
    if (readU32(data, 1) !== this.session) return false;

    const position = readU32(data, 5);
    if (position === END_OF_FILE) {
      this.finished = true;
      return true;
    }

    const length = byteAt(data, 9);
    this.chunks.set(position, data.subarray(10, 10 + length));
    return false;
  }

  get complete(): boolean {
    return this.finished;
  }

  get received(): number {
    let total = 0;
    for (const chunk of this.chunks.values()) total += chunk.length;
    return total;
  }

  /** Собранный файл. Позиции упорядочиваются, дыры схлопываются. */
  data(): Uint8Array {
    const positions = [...this.chunks.keys()].sort((a, b) => a - b);
    const out = new Uint8Array(this.received);
    let offset = 0;
    for (const position of positions) {
      const chunk = this.chunks.get(position);
      if (!chunk) continue;
      out.set(chunk, offset);
      offset += chunk.length;
    }
    return out;
  }
}
