/**
 * Чтение чисел из кадров устройства.
 *
 * Прямая индексация массива в этом проекте возвращает `number | undefined`, и
 * это правильно: кадр может прийти обрезанным, а из обрезанного кадра легко
 * прочитать правдоподобный мусор. Здесь границы проверяются один раз, а
 * вызывающий получает либо число, либо `undefined` — и решает, что с этим делать.
 *
 * Порядок байт в протоколе разный: основной канал старшим вперёд, диктофон —
 * младшим. Поэтому функции названы явно, «по умолчанию» тут не бывает.
 */

/** Один байт. */
export function u8(data: Uint8Array, offset: number): number | undefined {
  return offset >= 0 && offset < data.length ? data[offset] : undefined;
}

/** Байт со значением по умолчанию — для полей, где отсутствие равно нулю. */
export function byteAt(data: Uint8Array, offset: number, fallback = 0): number {
  return u8(data, offset) ?? fallback;
}

/** Два байта, старший вперёд. */
export function be16(data: Uint8Array, offset: number): number | undefined {
  if (offset < 0 || offset + 1 >= data.length) return undefined;
  return (byteAt(data, offset) << 8) | byteAt(data, offset + 1);
}

/** Четыре байта, старший вперёд. */
export function be32(data: Uint8Array, offset: number): number | undefined {
  if (offset < 0 || offset + 3 >= data.length) return undefined;
  const value =
    (byteAt(data, offset) << 24) |
    (byteAt(data, offset + 1) << 16) |
    (byteAt(data, offset + 2) << 8) |
    byteAt(data, offset + 3);
  return value >>> 0;
}

/** Четыре байта, младший вперёд: так устроен диктофон. */
export function le32(data: Uint8Array, offset: number): number | undefined {
  if (offset < 0 || offset + 3 >= data.length) return undefined;
  const value =
    byteAt(data, offset) |
    (byteAt(data, offset + 1) << 8) |
    (byteAt(data, offset + 2) << 16) |
    (byteAt(data, offset + 3) << 24);
  return value >>> 0;
}

/** Два байта, младший вперёд. */
export function le16(data: Uint8Array, offset: number): number | undefined {
  if (offset < 0 || offset + 1 >= data.length) return undefined;
  return byteAt(data, offset) | (byteAt(data, offset + 1) << 8);
}

/** Записать число четырьмя байтами, младший вперёд. */
export function toLe32(value: number): Uint8Array {
  return Uint8Array.from([
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  ]);
}

/** Записать число четырьмя байтами, старший вперёд. */
export function toBe32(value: number): Uint8Array {
  return Uint8Array.from([
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ]);
}

/** Записать число двумя байтами, старший вперёд. */
export function toBe16(value: number): Uint8Array {
  return Uint8Array.from([(value >> 8) & 0xff, value & 0xff]);
}

/** Время устройства: секунды с начала эпохи, старшим байтом вперёд. */
export function dateAt(data: Uint8Array, offset: number): Date | undefined {
  const seconds = be32(data, offset);
  return seconds === undefined ? undefined : new Date(seconds * 1000);
}

/** Склеить куски в один буфер. */
export function concat(...parts: readonly Uint8Array[]): Uint8Array {
  const size = parts.reduce((total, part) => total + part.length, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/**
 * Обмен с BLE идёт строками base64: обёртка радио не знает, что внутри кадра, и
 * не разбирает его. `Buffer` для этого не годится — в React Native его нет,
 * а `atob`/`btoa` есть.
 */
export function fromBase64(value: string): Uint8Array {
  const binary = globalThis.atob(value);
  const out = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) out[index] = binary.charCodeAt(index);
  return out;
}

export function toBase64(data: Uint8Array): string {
  let binary = '';
  for (const byte of data) binary += String.fromCharCode(byte);
  return globalThis.btoa(binary);
}

/** Строка ASCII из байтов: версии прошивки, модель, серийный номер. */
export function toAsciiString(data: Uint8Array): string {
  let text = '';
  for (const byte of data) text += String.fromCharCode(byte);
  return text;
}
