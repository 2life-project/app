import { byteAt, dateAt, toBe32 } from './bytes';

/**
 * Разбор полезной нагрузки браслета.
 *
 * Устройство упаковывает значения двумя похожими, но разными способами.
 * В ответе на запрос одного поля идут записи `тег | длина | значение`.
 * В ответе на запрос всей группы перед каждым тегом повторяется байт режима:
 * `AA | поле | длина | значение`. Спутать их — получить сдвиг на байт и
 * правдоподобный мусор вместо ошибки, поэтому разбор разведён по двум функциям.
 */

export type Field = {
  tag: number;
  value: Uint8Array;
};

/** Записи вида `тег | длина | значение`. */
export function parseTagged(payload: Uint8Array, from = 0): Field[] {
  return parse(payload, from, 0, 1, 2);
}

/** Записи вида `режим | поле | длина | значение`. Байт режима отбрасывается. */
export function parseModal(payload: Uint8Array, from = 0): Field[] {
  return parse(payload, from, 1, 2, 3);
}

function parse(
  payload: Uint8Array,
  from: number,
  tagAt: number,
  lengthAt: number,
  valueAt: number,
): Field[] {
  const fields: Field[] = [];
  let offset = from;

  while (offset + valueAt <= payload.length) {
    const tag = byteAt(payload, offset + tagAt);
    const length = byteAt(payload, offset + lengthAt);
    const start = offset + valueAt;
    if (start + length > payload.length) break;

    fields.push({ tag, value: payload.subarray(start, start + length) });
    offset = start + length;
  }

  return fields;
}

/** Найти поле по тегу. Отсутствие поля — норма: набор зависит от модели. */
export function field(fields: readonly Field[], tag: number): Uint8Array | undefined {
  return fields.find((item) => item.tag === tag)?.value;
}

/** Целое из значения поля. Порядок байт в протоколе — старшим вперёд. */
export function toInt(value: Uint8Array | undefined): number | undefined {
  if (!value || value.length === 0) return undefined;

  let result = 0;
  for (const byte of value) result = result * 256 + byte;
  return result;
}

/** Целое из поля по тегу — самая частая операция при разборе ответов. */
export function intField(fields: readonly Field[], tag: number): number | undefined {
  return toInt(field(fields, tag));
}

/**
 * Кодировка строки определяется полем, а не её содержимым: версии, модель и
 * серийный номер устройство шлёт в ASCII, а всё, что вводит человек — имена
 * будильников, контакты, текст уведомлений — в UTF-16BE. Признака кодировки в
 * кадре нет, поэтому вызывающий обязан знать, что читает.
 *
 * Угадывать по нулевым байтам нельзя: имя целиком из кириллицы даёт пары вида
 * `04 xx`, ни одного нуля, и такая догадка молча выдаст мусор.
 */
export function toAscii(value: Uint8Array | undefined): string | undefined {
  if (!value || value.length === 0) return undefined;
  return Buffer.from(value).toString('ascii').replace(/\0+$/, '');
}

export function toUtf16(value: Uint8Array | undefined): string | undefined {
  if (!value || value.length === 0) return undefined;

  let text = '';
  for (let index = 0; index + 1 < value.length; index += 2) {
    text += String.fromCharCode((byteAt(value, index) << 8) | byteAt(value, index + 1));
  }
  return text.replace(/\0+$/, '');
}

/** Время устройства — обычный unix epoch, четыре байта старшим вперёд. */
export function toDate(value: Uint8Array | undefined): Date | undefined {
  return value ? dateAt(value, 0) : undefined;
}

/** Четыре байта времени для запроса истории. */
export function encodeTime(date: Date): Uint8Array {
  return toBe32(Math.floor(date.getTime() / 1000));
}
