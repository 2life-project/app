import { Sha256, sha256, uuidFrom } from './sha256';

const bytes = (text: string) => new TextEncoder().encode(text);

describe('sha256', () => {
  // Контрольные значения из FIPS 180-4 и общеизвестных проверок: своя
  // реализация без них — просто функция, возвращающая что-то похожее.
  it('считает известные значения', () => {
    expect(sha256(new Uint8Array())).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
    expect(sha256(bytes('abc'))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(sha256(bytes('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'))).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
  });

  // Ровно 64 байта — блок без хвоста, 55 и 56 — граница, за которой длина уже
  // не влезает в последний блок и он удваивается.
  it('берёт границы блока', () => {
    expect(sha256(bytes('a'.repeat(55)))).toBe(
      '9f4390f8d30c2dd92ec9f095b65e2b9ae9b0a925a5258e241c9f1e910f734318',
    );
    expect(sha256(bytes('a'.repeat(56)))).toBe(
      'b35439a4ac6f0948b6d6f9e3c6af0f5f590ce20f1bde7090ef7970686ec6738a',
    );
    expect(sha256(bytes('a'.repeat(64)))).toBe(
      'ffe054fe7ae0cb6dc65c3af9b61d5209f439851db43d0ba5997337df154668eb',
    );
  });

  it('миллион байт даёт то же, что спецификация', () => {
    const hash = new Sha256();
    const chunk = bytes('a'.repeat(1000));
    for (let index = 0; index < 1000; index += 1) hash.update(chunk);

    expect(hash.digest()).toBe('cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0');
  });

  // Файл приходит кусками произвольного размера: если счётчик собирает их
  // иначе, чем один сплошной массив, сервер отвергнет уже загруженный файл.
  it('порезанный на куски поток даёт тот же хеш, что сплошной', () => {
    const whole = new Uint8Array(500).map((_, index) => (index * 7) % 256);
    const streamed = new Sha256();
    let offset = 0;

    for (const size of [1, 63, 64, 65, 100, 207]) {
      streamed.update(whole.subarray(offset, offset + size));
      offset += size;
    }

    expect(streamed.digest()).toBe(sha256(whole));
  });
});

describe('uuidFrom', () => {
  it('даёт UUID пятой версии', () => {
    expect(uuidFrom('band|activity_samples|2026-09-10T09:00:00.000Z')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('одно имя — один и тот же идентификатор, разные имена — разные', () => {
    expect(uuidFrom('a')).toBe(uuidFrom('a'));
    expect(uuidFrom('a')).not.toBe(uuidFrom('b'));
  });
});
