// Генератор цветовых шкал. Запуск: make tokens
//
// Считает 12-ступенчатые шкалы в OKLCH и печатает их в src/shared/theme/palette.gen.ts.
// OKLCH выбран потому, что в нём равный шаг светлоты выглядит равным на глаз —
// в HSL «одинаковые» ступени разных оттенков дают разную контрастность.
// Разбиение на 12 ступеней и роли ступеней — по шкале Radix Colors.
//
// Ручная правка сгенерированного файла бессмысленна: следующий запуск затрёт.
// Меняют РЕЦЕПТ ниже.
import { writeFileSync } from 'node:fs';

/**
 * Оттенок в градусах OKLCH и предельная насыщенность семейства.
 * `solid*` — желаемая светлота ступеней 9–10; генератор подвинет её ровно настолько,
 * чтобы подпись на заливке прошла WCAG AA (4.5:1). Насколько подвинул — печатает.
 */
const RECIPE = {
  neutral: { hue: 248, peakChroma: 0.022, solidLight: 0.55, solidDark: 0.62 },
  accent: { hue: 225, peakChroma: 0.155, solidLight: 0.62, solidDark: 0.66 },
  success: { hue: 150, peakChroma: 0.145, solidLight: 0.68, solidDark: 0.72 },
  warning: { hue: 82, peakChroma: 0.15, solidLight: 0.82, solidDark: 0.84 },
  danger: { hue: 27, peakChroma: 0.17, solidLight: 0.6, solidDark: 0.64 },
};

/** Контраст текста к фону обязан быть не ниже AA для основного размера. */
const MIN_CONTRAST = 4.5;

/** Насколько далеко можно увести заливку от рецепта ради предпочтительной подписи. */
const LABEL_BUDGET = 0.15;

// Ступени 1–12 по Radix: 1–2 фон, 3–5 фон компонента, 6–8 границы,
// 9–10 сплошная заливка, 11–12 текст. Светлота ступеней 9–10 задаётся рецептом:
// у жёлтого чистый цвет живёт заметно выше по светлоте, чем у синего.
const LIGHT_L = [0.9925, 0.984, 0.964, 0.945, 0.925, 0.9, 0.865, 0.805, null, null, 0.515, 0.29];
const DARK_L = [0.178, 0.213, 0.254, 0.286, 0.317, 0.356, 0.413, 0.5, null, null, 0.77, 0.945];

const LIGHT_C = [0.03, 0.065, 0.14, 0.2, 0.255, 0.31, 0.38, 0.5, 1, 0.98, 0.66, 0.28];
const DARK_C = [0.045, 0.075, 0.155, 0.215, 0.27, 0.325, 0.4, 0.52, 1, 1, 0.64, 0.23];

// --- OKLCH → sRGB ----------------------------------------------------------

function oklchToLinearRgb(L, C, hDeg) {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = ([r, g, b]) => [r, g, b].every((v) => v >= -0.0001 && v <= 1.0001);

const encode = (v) => {
  const clamped = Math.min(1, Math.max(0, v));
  const srgb = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
  return Math.round(srgb * 255);
};

/** Сжимает насыщенность, пока цвет не влезет в sRGB: светлоту и оттенок сохраняем. */
function toHex(L, C, hue) {
  let lo = 0;
  let hi = C;
  if (!inGamut(oklchToLinearRgb(L, C, hue))) {
    for (let i = 0; i < 24; i += 1) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToLinearRgb(L, mid, hue))) lo = mid;
      else hi = mid;
    }
  } else {
    lo = C;
  }
  const [r, g, b] = oklchToLinearRgb(L, lo, hue);
  return `#${[r, g, b].map((v) => encode(v).toString(16).padStart(2, '0')).join('')}`;
}

// --- контраст (WCAG 2.2) ---------------------------------------------------

const channel = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Светлота заливки, при которой подпись на ней читается.
 *
 * На светлой теме заливка тёмная с белой подписью, на тёмной — светлая с тёмной:
 * так делает Material 3, и так кнопка одинаково читается в обеих темах.
 * Идём от значения из рецепта наружу шагами по 0.005 и берём первое, которое
 * проходит AA с предпочтительной подписью; если ради этого пришлось бы убить
 * цвет (случай жёлтого), оставляем цвет и меняем подпись.
 */
function solveSolid(recipe, wanted, preferred) {
  const ink = toHex(0.22, Math.min(recipe.peakChroma, 0.03), recipe.hue);
  const candidates = [];
  for (let l = 0.28; l <= 0.94; l += 0.005) candidates.push(Number(l.toFixed(3)));
  candidates.sort((a, b) => Math.abs(a - wanted) - Math.abs(b - wanted));

  const label = preferred === 'light' ? '#ffffff' : ink;

  for (const L of candidates) {
    if (Math.abs(L - wanted) > LABEL_BUDGET) continue;
    const hex = toHex(L, recipe.peakChroma, recipe.hue);
    if (contrast(label, hex) >= MIN_CONTRAST) return { L, hex, on: label };
  }

  // Не вышло без потери цвета — оставляем цвет и меняем подпись.
  for (const L of candidates) {
    const hex = toHex(L, recipe.peakChroma, recipe.hue);
    const onLight = contrast('#ffffff', hex);
    const onDark = contrast(ink, hex);
    if (Math.max(onLight, onDark) >= MIN_CONTRAST) {
      return { L, hex, on: onLight >= onDark ? '#ffffff' : ink };
    }
  }
  throw new Error(`Не нашлась читаемая заливка для оттенка ${recipe.hue}`);
}

// --- сборка ----------------------------------------------------------------

function scale(recipe, mode) {
  const lightness = mode === 'light' ? LIGHT_L : DARK_L;
  const chroma = mode === 'light' ? LIGHT_C : DARK_C;

  const wanted = mode === 'light' ? recipe.solidLight : recipe.solidDark;
  const solid = solveSolid(recipe, wanted, mode === 'light' ? 'light' : 'dark');
  const shift = mode === 'light' ? -0.045 : 0.045;

  const steps = {};
  for (let i = 0; i < 12; i += 1) {
    if (i === 8) {
      steps[9] = solid.hex;
    } else if (i === 9) {
      steps[10] = toHex(solid.L + shift, chroma[9] * recipe.peakChroma, recipe.hue);
    } else {
      steps[i + 1] = toHex(lightness[i], chroma[i] * recipe.peakChroma, recipe.hue);
    }
  }
  return { steps, on: solid.on, moved: Math.abs(solid.L - wanted) };
}

const modes = ['light', 'dark'];
const report = [];

const body = modes
  .map((mode) => {
    const families = Object.entries(RECIPE)
      .map(([name, recipe]) => {
        const { steps, on, moved } = scale(recipe, mode);
        if (moved > 0.004)
          report.push(`${mode}/${name}: заливка сдвинута на ${moved.toFixed(3)} ради контраста`);
        const rows = Object.entries(steps)
          .map(([step, hex]) => `      ${step}: '${hex}',`)
          .join('\n');
        return `    ${name}: {\n${rows}\n      on: '${on}',\n    },`;
      })
      .join('\n');
    return `  ${mode}: {\n${families}\n  },`;
  })
  .join('\n');

const file = `// СГЕНЕРИРОВАНО scripts/generate-palette.mjs — не править руками.
// Пересобрать: make tokens. Рецепт оттенков живёт в самом скрипте.
//
// Ступени по шкале Radix Colors:
//  1–2  фон страницы            7–8   границы интерактивных элементов
//  3–5  фон компонента          9–10  сплошная заливка (кнопка, индикатор)
//  6    разделители             11–12 текст: приглушённый и основной
//  on   подпись, которая читается на ступенях 9–10 (проверено на 4.5:1)
export type ColorStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type ColorFamily = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
export type ColorScale = Readonly<Record<ColorStep, string> & { on: string }>;

export const scales: Readonly<Record<'light' | 'dark', Readonly<Record<ColorFamily, ColorScale>>>> = {
${body}
};
`;

writeFileSync(new URL('../src/shared/theme/palette.gen.ts', import.meta.url), file);
process.stdout.write(
  `src/shared/theme/palette.gen.ts обновлён\n${report.map((r) => `  ${r}\n`).join('')}`,
);
