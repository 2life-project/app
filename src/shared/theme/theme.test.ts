import appJson from '../../../app.json';

import { scales } from './palette.gen';
import { size, space, textVariant } from './primitives';
import { theme } from './theme';

const HEX = /^#[0-9a-f]{6}$/;

// Считаем контраст независимо от генератора: тест проверяет результат,
// а не повторяет вычисления, которыми он получен. Формула — WCAG 2.2.
const channel = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16) / 255));
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

function contrast(a: string, b: string) {
  const [hi = 0, lo = 0] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const families = ['neutral', 'accent', 'success', 'warning', 'danger'] as const;
const steps = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

describe('шкалы цвета', () => {
  it('все ступени — разбираемый hex', () => {
    for (const family of families) {
      for (const step of steps) expect(scales[family][step]).toMatch(HEX);
      expect(scales[family].on).toMatch(HEX);
    }
  });

  // Проверяем двумя отрезками. Переход 8→9 из них исключён намеренно:
  // ступень 9 — чистый цвет семейства, и у тёплых оттенков он светлее
  // границы. Так же устроены и шкалы Radix.
  const descending = (family: (typeof families)[number], from: number, to: number) => {
    for (let step = from; step < to; step += 1) {
      const current = luminance(scales[family][step as (typeof steps)[number]]);
      const next = luminance(scales[family][(step + 1) as (typeof steps)[number]]);
      expect(next).toBeLessThan(current);
    }
  };

  it.each(families)('в семействе %s поверхности и границы темнеют по порядку', (family) => {
    descending(family, 1, 8);
  });

  // Если 11 всплывает выше 10, это визуально один цвет: ровно так шкала и ломалась.
  it.each(families)('в семействе %s заливка и текст темнеют по порядку', (family) => {
    descending(family, 9, 12);
  });

  it.each(families)('в семействе %s нажатая заливка отличима от текста', (family) => {
    expect(contrast(scales[family][10], scales[family][11])).toBeGreaterThanOrEqual(1.3);
  });
});

describe('контраст', () => {
  it('текст читается на фоне страницы и карточки', () => {
    const { color } = theme;

    for (const background of [color.background, color.surface, color.surfaceSunken]) {
      expect(contrast(color.text, background)).toBeGreaterThanOrEqual(7);
      expect(contrast(color.textMuted, background)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(families)('подпись на заливке %s проходит AA', (family) => {
    const tone = theme.color[family];

    expect(contrast(tone.on, tone.solid)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(tone.on, tone.solidPressed)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(families)('смысловой текст %s читается на своей плашке', (family) => {
    const tone = theme.color[family];

    expect(contrast(tone.text, tone.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(tone.text, theme.color.background)).toBeGreaterThanOrEqual(4.5);
  });

  // WCAG 2.2, SC 1.4.11: индикатор фокуса — нетекстовый элемент, порог 3:1.
  it('кольцо фокуса видно на всех поверхностях', () => {
    const { color } = theme;

    for (const background of [color.background, color.surface, color.surfaceSunken]) {
      expect(contrast(color.focusRing, background)).toBeGreaterThanOrEqual(3);
    }
  });

  // Выключенный элемент выведен из-под требований контраста, но исчезать
  // он тоже не должен: аффорданс обязан остаться видимым.
  it('выключенный текст ещё различим на своей подложке', () => {
    expect(contrast(theme.color.textDisabled, theme.color.surfaceSunken)).toBeGreaterThanOrEqual(2);
  });
});

describe('размеры', () => {
  it('шаг сетки кратен четырём', () => {
    for (const value of Object.values(space)) expect(value % 4).toBe(0);
  });

  it('зона нажатия не меньше 44pt', () => {
    expect(size.tapTarget).toBeGreaterThanOrEqual(44);
  });

  it('у каждой роли текста интерлиньяж не меньше кегля', () => {
    for (const variant of Object.values(textVariant)) {
      expect(variant.lineHeight).toBeGreaterThanOrEqual(variant.fontSize);
    }
  });
});

// app.json линтер не читает: цвета из него — единственная копия палитры,
// которую нечем удержать в синхроне, кроме этой проверки.
describe('app.json', () => {
  function splashBackground() {
    for (const plugin of appJson.expo.plugins) {
      if (!Array.isArray(plugin) || plugin[0] !== 'expo-splash-screen') continue;
      const options = plugin[1];
      if (typeof options === 'object') return options.backgroundColor;
    }
    return undefined;
  }

  it('фон приложения совпадает с токеном темы', () => {
    expect(appJson.expo.backgroundColor).toBe(theme.color.background);
  });

  it('фон сплэша совпадает с токеном темы', () => {
    expect(splashBackground()).toBe(theme.color.background);
  });

  it('тема одна — системная схема не переключает приложение', () => {
    expect(appJson.expo.userInterfaceStyle).toBe('light');
  });
});
