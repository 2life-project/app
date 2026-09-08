/**
 * Многокадровая запись на устройство.
 *
 * Настройки, где значений несколько — будильники, погода, контакты, текст
 * уведомления — отправляются пачкой: несколько кадров с растущим номером и
 * закрывающий кадр с контрольной суммой по всем отправленным байтам, включая
 * повторяющиеся заголовки.
 *
 * Схема сверена с открытой реализацией того же протокола
 * (github.com/tcsenpai/ht36, MIT) — она подтверждена на живом устройстве.
 */

import { concat } from './bytes';
import { Mode } from './frame';

const HEADER = 0x01;
const TERMINATOR = 0xfd;

/** Сколько байт полезной нагрузки влезает в кадр при MTU 247. */
const CHUNK = 230;

export type Tlv = {
  tag: number;
  value: Uint8Array;
};

/** Запись вида `AB | поле | длина | значение` — так устроены поля внутри пачки. */
export function tlv(tag: number, value: Uint8Array): Uint8Array {
  const out = new Uint8Array(3 + value.length);
  out.set([Mode.write, tag, value.length]);
  out.set(value, 3);
  return out;
}

export function tlvByte(tag: number, value: number): Uint8Array {
  return tlv(tag, Uint8Array.from([value & 0xff]));
}

export function tlvWord(tag: number, value: number): Uint8Array {
  return tlv(tag, Uint8Array.from([(value >> 8) & 0xff, value & 0xff]));
}

/**
 * Текст для устройства идёт в UTF-16BE. Символы вне базовой плоскости —
 * эмодзи — занимают две пары байт, поэтому длина считается в байтах, а не в
 * символах: иначе прошивка отрежет строку по середине пары.
 */
export function utf16(text: string): Uint8Array {
  const units: number[] = [];

  for (const character of text) {
    const code = character.codePointAt(0) ?? 0x20;
    if (code > 0xffff) {
      const rest = code - 0x10000;
      const high = 0xd800 + (rest >> 10);
      const low = 0xdc00 + (rest & 0x3ff);
      units.push((high >> 8) & 0xff, high & 0xff, (low >> 8) & 0xff, low & 0xff);
    } else {
      units.push((code >> 8) & 0xff, code & 0xff);
    }
  }

  return Uint8Array.from(units);
}

/** Обрезать текст до предела прошивки, не разрывая суррогатную пару. */
export function clamp(text: string, maxChars: number): string {
  return [...text].slice(0, maxChars).join('');
}

/**
 * Собрать пачку кадров. `field` обычно равен режиму записи — так протокол
 * помечает «все поля группы».
 */
export function encodeBatch(
  cmd: number,
  field: number,
  parts: readonly Uint8Array[],
): Uint8Array[] {
  const payload = concat(...parts);
  const frames: Uint8Array[] = [];
  let xor = 0;

  const feed = (frame: Uint8Array) => {
    for (const byte of frame) xor ^= byte;
    frames.push(frame);
  };

  for (
    let offset = 0, sequence = 0;
    offset < payload.length || sequence === 0;
    offset += CHUNK, sequence += 1
  ) {
    const slice = payload.subarray(offset, offset + CHUNK);
    const frame = new Uint8Array(5 + slice.length);
    frame.set([HEADER, cmd, Mode.write, field, sequence & 0xff]);
    frame.set(slice, 5);
    feed(frame);
  }

  frames.push(Uint8Array.from([HEADER, cmd, Mode.write, field, TERMINATOR, xor & 0xff]));
  return frames;
}

// ------------------------------------------------------------- уведомления

/** Типы, которые прошивка различает по-разному вибрируя. */
export const NotificationKind = {
  call: 0x01,
  message: 0x02,
  application: 0x07,
} as const;

/**
 * Уведомление. Экрана у ES100 нет, поэтому до человека дойдёт вибрация и
 * светодиод — но текст всё равно передаётся: по нему прошивка выбирает тип
 * сигнала.
 */
export function notification(options: {
  kind: number;
  title: string;
  body: string;
  application?: string;
}): Uint8Array[] {
  return encodeBatch(0xb0, Mode.write, [
    tlv(0x01, utf16(clamp(options.application ?? '', 32))),
    tlv(0x03, utf16(clamp(options.body, 60))),
    tlv(0x07, utf16(clamp(options.title, 32))),
    tlvByte(0x08, options.kind),
    tlvByte(0x09, 1),
  ]);
}

/** Разрешить устройству показывать звонки и сообщения. */
export function notificationConfig(calls: boolean, messages: boolean): Uint8Array[] {
  return encodeBatch(0xb2, Mode.write, [
    tlvByte(0x01, calls ? 1 : 0),
    tlvByte(0x02, messages ? 1 : 0),
  ]);
}

// ---------------------------------------------------------------- будильники

export type Alarm = {
  /** Номер слота, с единицы. */
  slot: number;
  enabled: boolean;
  hour: number;
  minute: number;
  /** Маска дней: бит 0 — воскресенье, бит 6 — суббота. */
  days: number;
  label?: string;
};

/**
 * Будильники пишутся целиком: слоты, которых нет в списке, обнуляются. Поэтому
 * перед записью надо прочитать текущие и передать их вместе с изменённым.
 */
export function alarms(list: readonly Alarm[]): Uint8Array[] {
  const parts: Uint8Array[] = [];

  for (const alarm of list) {
    parts.push(tlv(0x01, Uint8Array.from([alarm.slot, alarm.slot])));
    parts.push(tlv(0x02, Uint8Array.from([alarm.slot, alarm.days])));
    parts.push(tlv(0x03, Uint8Array.from([alarm.slot, alarm.enabled ? 1 : 0])));
    parts.push(tlv(0x04, Uint8Array.from([alarm.slot, alarm.hour, alarm.minute])));

    if (alarm.label) {
      const name = utf16(clamp(alarm.label, 20));
      const value = new Uint8Array(1 + name.length);
      value[0] = alarm.slot;
      value.set(name, 1);
      parts.push(tlv(0x05, value));
    }
  }

  return encodeBatch(0xc7, Mode.write, parts);
}
