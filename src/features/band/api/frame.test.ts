import { isReplyTo, Mode } from './frame';

const bytes = (...values: number[]) => Uint8Array.from(values);

/** Ожидание для запроса «все поля группы»: поле дублирует режим чтения. */
const readAll = (cmd: number) => ({ cmd, mode: Mode.read, field: Mode.read });

describe('isReplyTo', () => {
  it('ответ с тем же полем принимается', () => {
    // 01 A4 AA AA … — паспорт устройства отвечает тем же полем, что и запрос.
    expect(isReplyTo(bytes(0x01, 0xa4, 0xaa, 0xaa, 0x00), readAll(0xa4))).toBe(true);
  });

  it('на запрос всех полей принимается ответ с конкретным полем', () => {
    // Живой случай: на 01 A3 AA AA часы отвечают 01 A3 AA 01 04 …
    const clock = bytes(0x01, 0xa3, 0xaa, 0x01, 0x04, 0x6a, 0xa1, 0x93, 0xe3);
    expect(isReplyTo(clock, readAll(0xa3))).toBe(true);
  });

  it('чужая группа не принимается, даже когда поле совпало', () => {
    const other = bytes(0x01, 0xc6, 0xaa, 0x01, 0x04, 0x00);
    expect(isReplyTo(other, readAll(0xa3))).toBe(false);
  });

  it('самостоятельный отчёт устройства не принимается за ответ', () => {
    // Режим ac — устройство говорит само. Без этой проверки живой отчёт о
    // пульсе попадал бы в середину истории как её кадр.
    const report = bytes(0x01, 0xa3, 0xac, 0x01, 0x04, 0x00);
    expect(isReplyTo(report, readAll(0xa3))).toBe(false);
  });

  it('при запросе конкретного поля чужое поле не принимается', () => {
    const expect02 = { cmd: 0xe1, mode: Mode.write, field: 0x02 };
    expect(isReplyTo(bytes(0x01, 0xe1, 0xab, 0x02), expect02)).toBe(true);
    expect(isReplyTo(bytes(0x01, 0xe1, 0xab, 0x0b), expect02)).toBe(false);
  });

  it('мусор и обрезанные кадры не принимаются', () => {
    expect(isReplyTo(bytes(0x01, 0xa3), readAll(0xa3))).toBe(false);
    expect(isReplyTo(bytes(0x02, 0xa3, 0xaa, 0xaa), readAll(0xa3))).toBe(false);
    expect(isReplyTo(new Uint8Array(0), readAll(0xa3))).toBe(false);
  });
});
