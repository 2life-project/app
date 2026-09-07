import appJson from '../../../app.json';

import { scales } from './palette.gen';
import { size, space, textVariant } from './primitives';
import { theme } from './theme';

const HEX = /^#[0-9a-f]{6}$/;

// Считаем контраст независимо от генератора: тест проверяет результат,
// а не повторяет вычисления, которыми он получен. Формула — WCAG 2.2.
const channel = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);

/**
 * Полупрозрачный цвет не имеет собственного контраста — он зависит от того, что
 * под ним. Поэтому цвет разрешается послойно: поверхность складывается с самой
 * тёмной ступенью фона, а текст — уже с получившейся поверхностью. Складывать
 * текст напрямую с фоном страницы неверно: он лежит на карточке, а не на ней.
 */
const BACKDROP = theme.color.backdrop;
const DARKEST_BACKDROP = BACKDROP[BACKDROP.length - 1] ?? '#ffffff';

const RGBA = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/;

type Rgb = [number, number, number];

function parse(color: string): { rgb: Rgb; alpha: number } {
  const match = RGBA.exec(color);

  if (!match) {
    const [r = 0, g = 0, b = 0] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
    return { rgb: [r, g, b], alpha: 1 };
  }

  const [r = 0, g = 0, b = 0] = [match[1], match[2], match[3]].map(Number);
  return { rgb: [r, g, b], alpha: match[4] === undefined ? 1 : Number(match[4]) };
}

/** Кладёт цвет на подложку и возвращает то, что видит глаз. */
function over(color: string, under: Rgb): Rgb {
  const { rgb, alpha } = parse(color);
  const [ur = 0, ug = 0, ub = 0] = under;
  const [r = 0, g = 0, b = 0] = rgb;

  return [r * alpha + ur * (1 - alpha), g * alpha + ug * (1 - alpha), b * alpha + ub * (1 - alpha)];
}

function luminance([r, g, b]: Rgb) {
  const [lr = 0, lg = 0, lb = 0] = [r, g, b].map((v) => channel(v / 255));
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/** Светлота цвета, заданного строкой: полупрозрачный кладём на белое. */
function lum(color: string) {
  return luminance(over(color, [255, 255, 255]));
}

function contrast(foreground: string, background: string) {
  const surface = over(background, over(DARKEST_BACKDROP, [255, 255, 255]));
  const text = over(foreground, surface);
  const [hi = 0, lo = 0] = [luminance(text), luminance(surface)].sort((x, y) => y - x);

  return (hi + 0.05) / (lo + 0.05);
}

const families = ['neutral', 'accent', 'highlight', 'success', 'warning', 'danger'] as const;
/** На этих заливках пишут подпись — им нужен текстовый порог. */
const textSurfaces = ['neutral', 'accent'] as const;
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
      const current = lum(scales[family][step as (typeof steps)[number]]);
      const next = lum(scales[family][(step + 1) as (typeof steps)[number]]);
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
  it('основной текст читается на всех поверхностях', () => {
    const { color } = theme;

    for (const background of [color.background, color.surface, color.surfaceSunken]) {
      expect(contrast(color.text, background)).toBeGreaterThanOrEqual(7);
    }
  });

  /*
   * Приглушённый текст макета — чернильный на 55% — даёт 3.36 на странице,
   * 3.31 на карточке и 3.26 на плитке внутри неё. Это ниже AA (4.5) везде,
   * и цифра здесь стоит не как одобрение, а как сторож: цвет оставлен по
   * решению владельца «один в один с макетом», но опуститься ещё ниже он не
   * должен. Поднять его до 65% — и AA возьмётся без правки чего-либо ещё.
   */
  it('приглушённый текст не опускается ниже уровня, взятого из макета', () => {
    for (const surface of [theme.color.background, theme.color.surface, theme.color.surfaceInner]) {
      expect(contrast(theme.color.textMuted, surface)).toBeGreaterThanOrEqual(3.25);
    }
  });

  it.each(textSurfaces)('подпись на заливке %s проходит AA', (family) => {
    const tone = theme.color[family];

    expect(contrast(tone.on, tone.solid)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(tone.on, tone.solidPressed)).toBeGreaterThanOrEqual(4.5);
  });

  // Статусные заливки — кольца, чипы, точки, полосы. Текст на них не пишут,
  // поэтому порог нетекстовый (WCAG 1.4.11), но различимость обязательна.
  it.each(families)('заливка %s отличима от фона страницы', (family) => {
    expect(contrast(theme.color[family].solid, theme.color.background)).toBeGreaterThanOrEqual(1.4);
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
  // Шкала отступов четырёхпиксельная. Исключения — величины, снятые с макета:
  // подгонять их под сетку значило бы разойтись с ним, а расходиться нельзя.
  const FROM_DESIGN = new Set(['screen', 'cardX', 'cardY', 'widget']);

  it('шкала отступов кратна четырём, кроме величин из макета', () => {
    for (const [name, value] of Object.entries(space)) {
      if (FROM_DESIGN.has(name)) continue;
      expect(value % 4).toBe(0);
    }
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
