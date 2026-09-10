/**
 * SHA-256 и производный от него идентификатор.
 *
 * Приёмник аудио проверяет присланный файл по SHA-256 его байтов, а
 * идентификаторы событий и записей обязаны быть UUID и **не меняться** между
 * попытками отправки. И то и другое считается здесь.
 *
 * Своя реализация, а не пакет: единственный кандидат — `expo-crypto` — тянет
 * нативный модуль, то есть пересборку дев-клиентов и нового билда в TestFlight
 * ради одной функции. Рядом уже лежит свой CRC-32 и сборка контейнера Ogg,
 * так что счёт по спецификации здесь — обычная работа модуля, а не трюк.
 *
 * Считает **по частям**: час записи весит семь мегабайт, а память диктофона
 * держит пятнадцать часов. Держать такой файл в памяти целиком ради хеша
 * нельзя, поэтому байты идут кусками, как их отдаёт файловая система.
 */

/** Кубические корни первых 64 простых, дробная часть. Константы спецификации. */
// prettier-ignore
const K = Uint32Array.from([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

/** Квадратные корни первых восьми простых, дробная часть. */
// prettier-ignore
const INITIAL = Uint32Array.from([
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
]);

const rotr = (value: number, bits: number) => ((value >>> bits) | (value << (32 - bits))) >>> 0;

/** Счётчик хеша: скармливать байты можно частями, итог берётся один раз. */
export class Sha256 {
  private readonly state = INITIAL.slice();
  /** Недобранный до 64 байт остаток предыдущей порции. */
  private readonly tail = new Uint8Array(64);
  private filled = 0;
  /** Общая длина в битах: спецификация дописывает её в конец, и она 64-битная. */
  private highBits = 0;
  private lowBits = 0;
  private readonly words = new Uint32Array(64);

  update(chunk: Uint8Array): this {
    this.lowBits += chunk.length * 8;
    // 2^32 бит — это 512 МиБ, и запись такого размера возможна: перенос
    // в старшую половину обязателен, иначе длина в хвосте окажется ложной.
    while (this.lowBits >= 0x100000000) {
      this.lowBits -= 0x100000000;
      this.highBits += 1;
    }

    let offset = 0;

    if (this.filled > 0) {
      const need = Math.min(64 - this.filled, chunk.length);
      this.tail.set(chunk.subarray(0, need), this.filled);
      this.filled += need;
      offset = need;
      if (this.filled < 64) return this;
      this.compress(this.tail, 0);
      this.filled = 0;
    }

    for (; offset + 64 <= chunk.length; offset += 64) this.compress(chunk, offset);

    if (offset < chunk.length) {
      this.tail.set(chunk.subarray(offset), 0);
      this.filled = chunk.length - offset;
    }
    return this;
  }

  /** Итог шестнадцатеричной строкой. После вызова счётчик дополнять нельзя. */
  digest(): string {
    const rest = new Uint8Array(this.filled < 56 ? 64 : 128);
    rest.set(this.tail.subarray(0, this.filled));
    rest[this.filled] = 0x80;

    const view = new DataView(rest.buffer);
    view.setUint32(rest.length - 8, this.highBits);
    view.setUint32(rest.length - 4, this.lowBits);

    for (let offset = 0; offset < rest.length; offset += 64) this.compress(rest, offset);

    let hex = '';
    for (const word of this.state) hex += word.toString(16).padStart(8, '0');
    return hex;
  }

  private compress(source: Uint8Array, offset: number): void {
    const w = this.words;

    for (let index = 0; index < 16; index += 1) {
      const at = offset + index * 4;
      w[index] =
        (((source[at] ?? 0) << 24) |
          ((source[at + 1] ?? 0) << 16) |
          ((source[at + 2] ?? 0) << 8) |
          (source[at + 3] ?? 0)) >>>
        0;
    }

    for (let index = 16; index < 64; index += 1) {
      const a = w[index - 15] ?? 0;
      const b = w[index - 2] ?? 0;
      const s0 = (rotr(a, 7) ^ rotr(a, 18) ^ (a >>> 3)) >>> 0;
      const s1 = (rotr(b, 17) ^ rotr(b, 19) ^ (b >>> 10)) >>> 0;
      w[index] = ((w[index - 16] ?? 0) + s0 + (w[index - 7] ?? 0) + s1) >>> 0;
    }

    let a = this.state[0] ?? 0;
    let b = this.state[1] ?? 0;
    let c = this.state[2] ?? 0;
    let d = this.state[3] ?? 0;
    let e = this.state[4] ?? 0;
    let f = this.state[5] ?? 0;
    let g = this.state[6] ?? 0;
    let h = this.state[7] ?? 0;

    for (let index = 0; index < 64; index += 1) {
      const s1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
      const choice = ((e & f) ^ (~e & g)) >>> 0;
      const temp1 = (h + s1 + choice + (K[index] ?? 0) + (w[index] ?? 0)) >>> 0;
      const s0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
      const majority = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const temp2 = (s0 + majority) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    const next = [a, b, c, d, e, f, g, h];
    for (let index = 0; index < 8; index += 1) {
      this.state[index] = ((this.state[index] ?? 0) + (next[index] ?? 0)) >>> 0;
    }
  }
}

export function sha256(data: Uint8Array): string {
  return new Sha256().update(data).digest();
}

const encoder = new TextEncoder();

/**
 * Устойчивый UUID из строки-имени.
 *
 * Контракт требует UUID и запрещает менять его между попытками: одно и то же
 * событие, прочитанное с устройства второй раз, обязано приехать под тем же
 * идентификатором, иначе приёмник заведёт вторую копию. Случайный UUID это
 * свойство даёт только пока цела память телефона; посчитанный из имени —
 * всегда.
 *
 * Форма пятой версии: она и определена как «UUID из имени». Хеш при этом
 * SHA-256, а не SHA-1, — на совместимость с чужими v5 мы не претендуем, а
 * SHA-1 пришлось бы писать второй раз ради формальности.
 */
export function uuidFrom(name: string): string {
  const hex = sha256(encoder.encode(name));
  const version = `5${hex.slice(13, 16)}`;
  // Вариант RFC 4122: два старших бита первого байта — 10.
  const variant = ((parseInt(hex.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + hex.slice(17, 20);

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${version}-${variant}-${hex.slice(20, 32)}`;
}
