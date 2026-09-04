import { scales } from './palette.gen';
import { size, space, textVariant } from './primitives';
import { themes } from './theme';

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

const modes = ['light', 'dark'] as const;
const families = ['neutral', 'accent', 'success', 'warning', 'danger'] as const;
const steps = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

describe('шкалы цвета', () => {
  it.each(modes)('в теме %s все ступени — разбираемый hex', (mode) => {
    for (const family of families) {
      for (const step of steps) expect(scales[mode][family][step]).toMatch(HEX);
      expect(scales[mode][family].on).toMatch(HEX);
    }
  });

  it.each(modes)('в теме %s ступени 1–8 идут по светлоте без разворотов', (mode) => {
    const direction = mode === 'light' ? -1 : 1;

    for (const family of families) {
      for (let step = 1; step < 8; step += 1) {
        const current = luminance(scales[mode][family][step as (typeof steps)[number]]);
        const next = luminance(scales[mode][family][(step + 1) as (typeof steps)[number]]);
        expect(Math.sign(next - current)).toBe(direction);
      }
    }
  });
});

describe('контраст', () => {
  it.each(modes)('в теме %s текст читается на фоне страницы и карточки', (mode) => {
    const { color } = themes[mode];

    for (const background of [color.background, color.surface, color.surfaceSunken]) {
      expect(contrast(color.text, background)).toBeGreaterThanOrEqual(7);
      expect(contrast(color.textMuted, background)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(modes)('в теме %s подпись на сплошной заливке проходит AA', (mode) => {
    const { color } = themes[mode];

    for (const family of families) {
      expect(contrast(color[family].on, color[family].solid)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(color[family].on, color[family].solidPressed)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(modes)('в теме %s смысловой текст читается на своей плашке', (mode) => {
    const { color } = themes[mode];

    for (const family of families) {
      expect(contrast(color[family].text, color[family].surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(color[family].text, color.background)).toBeGreaterThanOrEqual(4.5);
    }
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
    for (const role of Object.values(textVariant)) {
      expect(role.lineHeight).toBeGreaterThanOrEqual(role.fontSize);
    }
  });
});
