import { shouldCloseSheet } from './sheet-drag';

describe('перетаскивание шита', () => {
  it('вверх не закрывает: шит не отрывается от края экрана', () => {
    expect(shouldCloseSheet(-40, 400, 0)).toBe(false);
  });

  it('короткое протаскивание возвращает шит на место', () => {
    expect(shouldCloseSheet(40, 400, 0)).toBe(false);
  });

  it('протаскивание на треть высоты закрывает', () => {
    expect(shouldCloseSheet(140, 400, 0)).toBe(true);
  });

  // Быстрый смах — это намерение, даже если палец прошёл всего ничего.
  it('быстрый смах закрывает независимо от пройденного пути', () => {
    expect(shouldCloseSheet(20, 400, 1200)).toBe(true);
  });

  it('высота ещё не измерена — закрывает только смахом', () => {
    expect(shouldCloseSheet(200, 0, 0)).toBe(false);
    expect(shouldCloseSheet(200, 0, 1200)).toBe(true);
  });
});
