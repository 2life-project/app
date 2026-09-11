import { decodeTime } from './device';

const bytes = (...values: number[]) => Uint8Array.from(values);

describe('decodeTime', () => {
  it('читает часы из полей живого кадра', () => {
    // Кадр с устройства без заголовка `01 a3 aa`: поле 01 — секунды unix,
    // остальные поля — часовой формат и сутки, на время не влияют.
    const body = bytes(0x01, 0x04, 0x6a, 0xa3, 0xe2, 0xf6, 0x04, 0x01, 0x01, 0x08, 0x01, 0x01);

    expect(decodeTime(body)?.toISOString()).toBe('2026-09-11T11:16:06.000Z');
  });

  it('без поля времени отдаёт пустоту, а не дату из мусора', () => {
    expect(decodeTime(bytes(0x04, 0x01, 0x01))).toBeUndefined();
  });
});
