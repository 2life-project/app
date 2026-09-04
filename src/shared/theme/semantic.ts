import { scales, type ColorScale } from './palette.gen';

/**
 * Второй уровень токенов — роли. Компонент просит «фон карточки» и «текст
 * ошибки», а не «neutral 2» и «danger 11»: перекраска продукта тогда сводится
 * к правке рецепта шкал, а не к обходу сотни файлов.
 *
 * Обе темы собираются одной функцией из одинаковых номеров ступеней —
 * шкалы для тёмной темы построены так, что роль ступени в них сохраняется.
 */
export type ThemeMode = 'light' | 'dark';

/**
 * Единственное место, где темы расходятся: на светлой странице карточка белее
 * фона, на тёмной — светлее. Остальные роли берут одинаковые ступени.
 */
const SURFACE = {
  light: { background: 2, surface: 1, sunken: 3 },
  dark: { background: 1, surface: 2, sunken: 3 },
} as const;

/** Набор ролей одного семейства: от подложки до сплошной заливки. */
function tone(family: ColorScale) {
  return {
    /** Фон плашки этого смысла: тег, баннер. */
    surface: family[3],
    surfacePressed: family[5],
    border: family[6],
    borderStrong: family[7],
    /** Сплошная заливка: кнопка, индикатор, точка статуса. */
    solid: family[9],
    solidPressed: family[10],
    /** Текст этого смысла на обычном фоне. */
    text: family[11],
    textStrong: family[12],
    /** Подпись поверх `solid`. Пара проверена на 4.5:1 в тестах. */
    on: family.on,
  };
}

const ELEVATION = {
  light: {
    none: 'none',
    low: '0 1px 2px rgba(16, 24, 32, 0.06), 0 1px 1px rgba(16, 24, 32, 0.04)',
    medium: '0 4px 12px -4px rgba(16, 24, 32, 0.12), 0 2px 4px -2px rgba(16, 24, 32, 0.06)',
    high: '0 16px 32px -12px rgba(16, 24, 32, 0.2), 0 4px 8px -4px rgba(16, 24, 32, 0.08)',
  },
  // На тёмном фоне тень почти не читается — глубину держат ступени поверхностей,
  // тень остаётся только чтобы отделить всплывающее от страницы.
  dark: {
    none: 'none',
    low: '0 1px 2px rgba(0, 0, 0, 0.4)',
    medium: '0 4px 12px -4px rgba(0, 0, 0, 0.55)',
    high: '0 16px 32px -12px rgba(0, 0, 0, 0.7)',
  },
} as const;

export function buildTheme(mode: ThemeMode) {
  const scale = scales[mode];
  const surface = SURFACE[mode];

  return {
    mode,
    color: {
      /** Фон страницы. */
      background: scale.neutral[surface.background],
      /** Фон карточки и всего, что лежит на странице. */
      surface: scale.neutral[surface.surface],
      /** Углубление: поле ввода, неактивная плашка. */
      surfaceSunken: scale.neutral[surface.sunken],
      surfacePressed: scale.neutral[4],

      border: scale.neutral[6],
      borderStrong: scale.neutral[7],
      focusRing: scale.accent[8],

      text: scale.neutral[12],
      textMuted: scale.neutral[11],
      /** Только для выключенных элементов: контраст здесь намеренно низкий. */
      textDisabled: scale.neutral[8],

      /** Затемнение под шитом и модалкой — одинаковое в обеих темах. */
      overlay: 'rgba(9, 11, 13, 0.55)',

      neutral: tone(scale.neutral),
      accent: tone(scale.accent),
      success: tone(scale.success),
      warning: tone(scale.warning),
      danger: tone(scale.danger),
    },
    elevation: ELEVATION[mode],
  } as const;
}

export type Theme = ReturnType<typeof buildTheme>;
/** Смысловые семейства, из которых компонент выбирает тон. */
export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
