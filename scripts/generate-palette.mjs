// Генератор цветовых шкал — источник правды всей палитры. Запуск: make tokens
//
// Считает 12-ступенчатые шкалы в OKLCH: в нём равный шаг светлоты выглядит
// равным на глаз, чего не даёт HSL — там «одинаковые» ступени разных оттенков
// получаются разной яркости. Разбиение на 12 ступеней и их роли — по шкале
// Radix Colors.
//
// Сгенерированный файл руками не правят: следующий запуск затрёт.
// Меняют РЕЦЕПТ ниже.
import { writeFileSync } from 'node:fs';

/**
 * Оттенок в градусах OKLCH и предельная насыщенность семейства.
 *
 * `solid` — желаемая светлота ступеней 9–10; генератор подвинет её ровно
 * настолько, чтобы подпись на заливке прошла WCAG AA, и скажет, насколько.
 *
 * `brand` — необязательный фирменный цвет. Если он задан, ступень 9 берётся
 * как есть, без подгонки: дизайн-макет важнее математики, и подбирается только
 * подпись. Это тот шов, через который в систему входит цвет из макета,
 * не ломая остальные одиннадцать ступеней.
 */
const RECIPE = {
  neutral: { hue: 248, peakChroma: 0.022, solid: 0.55 },
  accent: { hue: 225, peakChroma: 0.155, solid: 0.62 },
  success: { hue: 150, peakChroma: 0.145, solid: 0.68 },
  warning: { hue: 82, peakChroma: 0.15, solid: 0.82 },
  danger: { hue: 27, peakChroma: 0.17, solid: 0.6 },
};

/** Контраст текста к фону обязан быть не ниже AA для основного размера. */
const MIN_CONTRAST = 4.5;

/** Насколько далеко можно увести заливку от рецепта ради белой подписи. */
const LABEL_BUDGET = 0.15;

/**
 * Ступени 1–8: фон страницы, фон компонента, разделители, границы.
 * Ступени 9–10 считаются от заливки, 11–12 — текст, см. `solveText`.
 */
const LIGHT_L = [0.9925, 0.984, 0.964, 0.945, 0.925, 0.9, 0.865, 0.805];
const LIGHT_C = [0.03, 0.065, 0.14, 0.2, 0.255, 0.31, 0.38, 0.5, 1, 0.98, 0.66, 0.28];

/**
 * Приглушённый текст (11) обязан быть отличим от нажатой заливки (10).
 * Раньше 11-я была константой и всплывала выше подвинутой 10-й: две ступени
 * становились одним цветом. Условие задаём не запасом по светлоте, а тем,
 * ради чего оно нужно, — разницей, которую видно.
 */
const STEP_10_11_CONTRAST = 1.35;
const MUTED_TEXT_L = 0.515;
const STRONG_TEXT_L = 0.29;

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
  let chroma = C;
  if (!inGamut(oklchToLinearRgb(L, C, hue))) {
    let lo = 0;
    let hi = C;
    for (let i = 0; i < 24; i += 1) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToLinearRgb(L, mid, hue))) lo = mid;
      else hi = mid;
    }
    chroma = lo;
  }
  const [r, g, b] = oklchToLinearRgb(L, chroma, hue);
  return `#${[r, g, b].map((v) => encode(v).toString(16).padStart(2, '0')).join('')}`;
}

// --- контраст (WCAG 2.2) ---------------------------------------------------

const channel = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => channel(parseInt(hex.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Светлота заливки, при которой подпись на ней читается. Идём от значения из
 * рецепта наружу шагами по 0.005 и берём первое, которое проходит AA с белой
 * подписью; если ради этого пришлось бы убить цвет — случай жёлтого, —
 * оставляем цвет и берём тёмную подпись в тон семейству.
 */
function solveSolid(recipe) {
  const ink = toHex(0.22, Math.min(recipe.peakChroma, 0.03), recipe.hue);

  if (recipe.brand) {
    const onLight = contrast('#ffffff', recipe.brand);
    const onDark = contrast(ink, recipe.brand);
    if (Math.max(onLight, onDark) < MIN_CONTRAST) {
      throw new Error(
        `Фирменный цвет ${recipe.brand} не держит подпись: лучший контраст ` +
          `${Math.max(onLight, onDark).toFixed(2)} при пороге ${MIN_CONTRAST}. ` +
          'Такой цвет нельзя использовать как заливку под текст.',
      );
    }
    return { L: null, hex: recipe.brand, on: onLight >= onDark ? '#ffffff' : ink, moved: 0 };
  }

  const candidates = [];
  for (let l = 0.28; l <= 0.94; l += 0.005) candidates.push(Number(l.toFixed(3)));
  candidates.sort((a, b) => Math.abs(a - recipe.solid) - Math.abs(b - recipe.solid));

  for (const L of candidates) {
    if (Math.abs(L - recipe.solid) > LABEL_BUDGET) continue;
    const hex = toHex(L, recipe.peakChroma, recipe.hue);
    if (contrast('#ffffff', hex) >= MIN_CONTRAST) {
      return { L, hex, on: '#ffffff', moved: Math.abs(L - recipe.solid) };
    }
  }

  for (const L of candidates) {
    const hex = toHex(L, recipe.peakChroma, recipe.hue);
    const onLight = contrast('#ffffff', hex);
    const onDark = contrast(ink, hex);
    if (Math.max(onLight, onDark) >= MIN_CONTRAST) {
      return { L, hex, on: onLight >= onDark ? '#ffffff' : ink, moved: Math.abs(L - recipe.solid) };
    }
  }

  throw new Error(`Не нашлась читаемая заливка для оттенка ${recipe.hue}`);
}

/** Светлота фирменного цвета нужна, чтобы поставить текстовые ступени ниже него. */
function lightnessOf(hex, recipe) {
  let best = 0.5;
  let bestDelta = Infinity;
  for (let l = 0.1; l <= 0.99; l += 0.002) {
    const delta = Math.abs(luminance(toHex(l, recipe.peakChroma, recipe.hue)) - luminance(hex));
    if (delta < bestDelta) {
      bestDelta = delta;
      best = l;
    }
  }
  return best;
}

// --- сборка ----------------------------------------------------------------

function scale(recipe) {
  const solid = solveSolid(recipe);
  const solidL = solid.L ?? lightnessOf(solid.hex, recipe);
  const pressedL = solidL - 0.045;

  const pressed = toHex(pressedL, LIGHT_C[9] * recipe.peakChroma, recipe.hue);

  // Опускаем текстовую ступень, пока её не станет видно отдельно от заливки.
  let mutedL = Math.min(MUTED_TEXT_L, pressedL - 0.02);
  let muted = toHex(mutedL, LIGHT_C[10] * recipe.peakChroma, recipe.hue);
  while (contrast(pressed, muted) < STEP_10_11_CONTRAST && mutedL > 0.2) {
    mutedL -= 0.005;
    muted = toHex(mutedL, LIGHT_C[10] * recipe.peakChroma, recipe.hue);
  }
  const strongL = Math.min(STRONG_TEXT_L, mutedL - 0.12);

  const steps = {};
  for (let i = 0; i < 8; i += 1) {
    steps[i + 1] = toHex(LIGHT_L[i], LIGHT_C[i] * recipe.peakChroma, recipe.hue);
  }
  steps[9] = solid.hex;
  steps[10] = pressed;
  steps[11] = muted;
  steps[12] = toHex(strongL, LIGHT_C[11] * recipe.peakChroma, recipe.hue);

  return { steps, on: solid.on, moved: solid.moved };
}

const report = [];
const families = Object.entries(RECIPE)
  .map(([name, recipe]) => {
    const { steps, on, moved } = scale(recipe);
    if (recipe.brand) report.push(`${name}: заливка взята из макета (${recipe.brand})`);
    else if (moved > 0.004)
      report.push(`${name}: заливка сдвинута на ${moved.toFixed(3)} ради контраста`);

    const rows = Object.entries(steps)
      .map(([step, hex]) => `    ${step}: '${hex}',`)
      .join('\n');
    return `  ${name}: {\n${rows}\n    on: '${on}',\n  },`;
  })
  .join('\n');

const file = `// СГЕНЕРИРОВАНО scripts/generate-palette.mjs — не править руками.
// Пересобрать: make tokens. Рецепт оттенков живёт в самом скрипте.
//
// Ступени по шкале Radix Colors:
//  1–2  фон страницы            7–8   границы интерактивных элементов
//  3–5  фон компонента          9–10  сплошная заливка и её нажатое состояние
//  6    разделители             11–12 текст: приглушённый и основной
//  on   подпись, которая читается на ступенях 9–10 (проверено на 4.5:1)
export type ColorStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type ColorFamily = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
export type ColorScale = Readonly<Record<ColorStep, string> & { on: string }>;

export const scales: Readonly<Record<ColorFamily, ColorScale>> = {
${families}
};
`;

writeFileSync(new URL('../src/shared/theme/palette.gen.ts', import.meta.url), file);
process.stdout.write(
  `src/shared/theme/palette.gen.ts обновлён\n${report.map((r) => `  ${r}\n`).join('')}`,
);
