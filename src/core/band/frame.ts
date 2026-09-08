import { byteAt, be16 } from './bytes';

/**
 * Кадры протокола браслета ES100 (диалект JX вендора UTE).
 *
 * Формат: `01 | CMD | MODE | FIELD | [LEN | payload]`. Длина присутствует только
 * когда есть полезная нагрузка, поэтому `01 A4 AA 16` — законченный запрос из
 * четырёх байт, а не обрезанный.
 *
 * Ответ на один запрос может прийти несколькими уведомлениями подряд. Последнее
 * несёт маркер `FD` и контрольную сумму, которая считается по всем байтам всех
 * кадров вместе с их заголовками — по одной полезной нагрузке она не сходится.
 */

/** Первый байт любого кадра основного протокола. */
const HEADER = 0x01;

/** Маркер последнего кадра в многокадровом ответе. */
const TERMINATOR = 0xfd;

/** Режим: чтение, запись или самостоятельный отчёт устройства. */
export const Mode = {
  read: 0xaa,
  write: 0xab,
  report: 0xac,
} as const;

export type ModeValue = (typeof Mode)[keyof typeof Mode];

/**
 * Группы `E8` (тренировки) и поле `04` группы `C6` (сон) нумеруют кадры двумя
 * байтами и закрываются двойным `FD FD`. Остальные обходятся одним байтом.
 * Перепутать — значит потерять все кадры кроме последнего: они схлопнутся в один
 * ключ и молча перезапишут друг друга.
 */
export function usesWideSequence(cmd: number, field: number): boolean {
  return cmd === 0xe8 || (cmd === 0xc6 && field === 0x04);
}

/** Собрать кадр запроса. Пустой payload означает кадр без байта длины. */
export function encode(
  cmd: number,
  mode: ModeValue,
  field: number,
  payload?: Uint8Array,
): Uint8Array {
  if (!payload || payload.length === 0) return Uint8Array.from([HEADER, cmd, mode, field]);

  const frame = new Uint8Array(5 + payload.length);
  frame.set([HEADER, cmd, mode, field, payload.length]);
  frame.set(payload, 5);
  return frame;
}

/** Запрос всех полей группы разом: режим дублируется вместо номера поля. */
export function encodeReadAll(cmd: number): Uint8Array {
  return Uint8Array.from([HEADER, cmd, Mode.read, Mode.read]);
}

export type Frame = {
  cmd: number;
  mode: ModeValue;
  field: number;
  /** Номер кадра в многокадровом ответе. */
  sequence: number;
  /** Тело без заголовка. У терминатора пустое. */
  payload: Uint8Array;
  /** Признак последнего кадра: дальше данных не будет. */
  final: boolean;
};

/**
 * Разобрать входящее уведомление. Возвращает null для мусора: устройство иногда
 * присылает короткие кадры чужого протокола, и падать на них нельзя.
 */
export function decode(data: Uint8Array): Frame | null {
  if (data.length < 4 || data[0] !== HEADER) return null;

  const cmd = byteAt(data, 1);
  const mode = byteAt(data, 2) as ModeValue;
  const field = byteAt(data, 3);
  const wide = usesWideSequence(cmd, field);

  if (data.length === 4) {
    return { cmd, mode, field, sequence: 0, payload: new Uint8Array(0), final: true };
  }

  if (byteAt(data, 4) === TERMINATOR) {
    return { cmd, mode, field, sequence: -1, payload: new Uint8Array(0), final: true };
  }

  const sequence = wide ? (be16(data, 4) ?? 0) : byteAt(data, 4);
  const start = wide ? 6 : 5;
  return { cmd, mode, field, sequence, payload: data.subarray(start), final: false };
}

/** Контрольная сумма ответа: XOR всех байт всех кадров, включая заголовки. */
export function checksum(frames: readonly Uint8Array[]): number {
  let xor = 0;
  for (const frame of frames) {
    for (const byte of frame) xor ^= byte;
  }
  return xor;
}

/**
 * Накопитель многокадрового ответа. Кадры приходят по номеру, а не по порядку
 * прихода, поэтому склеиваем по возрастанию номера — иначе при потере и повторе
 * куски встанут не туда.
 */
export class FrameAssembler {
  private readonly chunks = new Map<number, Uint8Array>();
  private readonly raw: Uint8Array[] = [];
  private done = false;
  private reported = -1;

  /** Принять уведомление. Возвращает true, когда ответ собран целиком. */
  push(data: Uint8Array): boolean {
    const frame = decode(data);
    if (!frame) return false;

    this.raw.push(data);
    if (frame.final) {
      // У терминатора контрольная сумма идёт сразу за маркером.
      this.reported = data.length > 5 ? byteAt(data, data.length - 1) : -1;
      this.done = true;
      return true;
    }

    this.chunks.set(frame.sequence, frame.payload);
    return false;
  }

  get complete(): boolean {
    return this.done;
  }

  /**
   * Сошлась ли контрольная сумма. Терминатор входит в подсчёт частично: его
   * собственные байты складываются в ту же сумму, поэтому сверяем только когда
   * устройство её прислало.
   */
  get valid(): boolean {
    if (this.reported < 0) return true;
    const withoutChecksum = this.raw.slice(0, -1);
    return checksum(withoutChecksum) === this.reported;
  }

  /** Склеенное тело ответа. */
  body(): Uint8Array {
    const keys = [...this.chunks.keys()].sort((a, b) => a - b);
    const size = keys.reduce((total, key) => total + (this.chunks.get(key)?.length ?? 0), 0);
    const out = new Uint8Array(size);
    let offset = 0;
    for (const key of keys) {
      const chunk = this.chunks.get(key);
      if (!chunk) continue;
      out.set(chunk, offset);
      offset += chunk.length;
    }
    return out;
  }
}
