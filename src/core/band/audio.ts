import { concat } from './bytes';
import { BYTES_PER_SECOND } from './recorder';

/**
 * Упаковка записи в файл, который можно проиграть и отправить.
 *
 * Браслет отдаёт голый поток пакетов Opus по сорок байт: ни контейнера, ни
 * заголовка. Такой файл технически валиден, но плеер его не откроет и часть
 * сервисов распознавания не примет.
 *
 * Здесь пакеты заворачиваются в контейнер Ogg. Это именно упаковка, а не
 * перекодирование: байты звука не трогаются, размер не растёт, декодер не нужен.
 * Разворачивать в PCM на телефоне бессмысленно — час записи весит семь мегабайт,
 * а после распаковки весил бы сто пятнадцать.
 */

/** Размер пакета: прошивка пишет постоянным битрейтом. */
const PACKET = 40;

/** Длительность пакета. Opus всегда считает время в сорока восьми килогерцах. */
const SAMPLES_PER_PACKET = 960;

/** Частота записи браслета. */
const SAMPLE_RATE = 16_000;

const OGG = new Uint8Array([0x4f, 0x67, 0x67, 0x53]); // «OggS»

const CRC_TABLE = buildCrcTable();

/**
 * Ogg использует собственный CRC-32: полином тот же, что у Ethernet, но без
 * инверсий и отражения битов. Готовые реализации CRC сюда не подходят.
 */
function buildCrcTable(): Uint32Array {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let value = index << 24;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 0x80000000 ? ((value << 1) ^ 0x04c11db7) >>> 0 : (value << 1) >>> 0;
    }
    table[index] = value >>> 0;
  }

  return table;
}

function crc32(data: Uint8Array): number {
  let crc = 0;
  for (const byte of data) {
    const index = ((crc >>> 24) ^ byte) & 0xff;
    crc = ((crc << 8) ^ (CRC_TABLE[index] ?? 0)) >>> 0;
  }
  return crc >>> 0;
}

function le32(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff];
}

function le64(value: number): number[] {
  // Позиция в сэмплах: для часовой записи это меньше двух миллиардов, поэтому
  // старшие четыре байта всегда нулевые.
  return [...le32(value >>> 0), 0, 0, 0, 0];
}

/**
 * Собрать страницу Ogg. Контрольная сумма считается по всей странице с нулями
 * на месте самой суммы, поэтому её вписывают уже после сборки.
 */
function page(options: {
  headerType: number;
  granule: number;
  serial: number;
  sequence: number;
  packets: readonly Uint8Array[];
}): Uint8Array {
  const lacing: number[] = [];
  for (const packet of options.packets) {
    let rest = packet.length;
    while (rest >= 255) {
      lacing.push(255);
      rest -= 255;
    }
    lacing.push(rest);
  }

  const header = Uint8Array.from([
    ...OGG,
    0x00,
    options.headerType,
    ...le64(options.granule),
    ...le32(options.serial),
    ...le32(options.sequence),
    0,
    0,
    0,
    0,
    lacing.length,
    ...lacing,
  ]);

  const body = concat(...options.packets);
  const full = concat(header, body);

  const checksum = crc32(full);
  full.set(le32(checksum), 22);
  return full;
}

/** Заголовок потока: канал один, частота как у записи. */
function opusHead(): Uint8Array {
  return Uint8Array.from([
    0x4f,
    0x70,
    0x75,
    0x73,
    0x48,
    0x65,
    0x61,
    0x64, // «OpusHead»
    1, // версия
    1, // каналов
    ...[0x38, 0x01], // задержка кодера, 312 сэмплов
    ...le32(SAMPLE_RATE),
    0,
    0, // усиление
    0, // раскладка каналов
  ]);
}

function opusTags(): Uint8Array {
  const vendor = new TextEncoder().encode('2life band');
  return Uint8Array.from([
    0x4f,
    0x70,
    0x75,
    0x73,
    0x54,
    0x61,
    0x67,
    0x73, // «OpusTags»
    ...le32(vendor.length),
    ...vendor,
    ...le32(0), // список комментариев пуст
  ]);
}

/** Сколько секунд звучит запись. Считается по размеру, а не по полю прошивки. */
export function durationSeconds(bytes: number): number {
  return bytes / BYTES_PER_SECOND;
}

/**
 * Завернуть поток пакетов в Ogg.
 *
 * Пакеты укладываются пачками: одна страница на несколько кадров, иначе на
 * каждые сорок байт звука пришлось бы под тридцать байт служебных.
 */
export function toOgg(raw: Uint8Array): Uint8Array {
  const serial = Math.floor(Math.random() * 0xffffffff) >>> 0;
  const pages: Uint8Array[] = [
    page({ headerType: 0x02, granule: 0, serial, sequence: 0, packets: [opusHead()] }),
    page({ headerType: 0x00, granule: 0, serial, sequence: 1, packets: [opusTags()] }),
  ];

  const packetsPerPage = 50;
  let sequence = 2;
  let granule = 0;

  for (let offset = 0; offset < raw.length; offset += PACKET * packetsPerPage) {
    const packets: Uint8Array[] = [];
    for (let index = 0; index < packetsPerPage; index += 1) {
      const start = offset + index * PACKET;
      if (start + PACKET > raw.length) break;
      packets.push(raw.subarray(start, start + PACKET));
    }
    if (packets.length === 0) break;

    granule += packets.length * SAMPLES_PER_PACKET;
    const last = offset + PACKET * packetsPerPage >= raw.length;
    pages.push(page({ headerType: last ? 0x04 : 0x00, granule, serial, sequence, packets }));
    sequence += 1;
  }

  return concat(...pages);
}
