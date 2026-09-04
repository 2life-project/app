import { scales, type ColorScale } from './palette.gen';

/**
 * Второй уровень токенов — роли. Компонент просит «фон карточки» и «текст
 * ошибки», а не «neutral 2» и «danger 11»: перекраска продукта тогда сводится
 * к правке рецепта шкал, а не к обходу сотни файлов.
 *
 * Тема одна. Когда появится тёмная, здесь возникнет вторая такая же карта
 * ролей из тех же номеров ступеней, а компоненты перейдут с прямого импорта
 * `theme` на хук. Пока второй темы нет, провайдер и контекст были бы
 * проводами в никуда.
 */

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

export const theme = {
  color: {
    /** Фон страницы. */
    background: scales.neutral[2],
    /** Фон карточки и всего, что лежит на странице. */
    surface: scales.neutral[1],
    /** Углубление: поле ввода, неактивная плашка. */
    surfaceSunken: scales.neutral[3],
    surfacePressed: scales.neutral[4],

    border: scales.neutral[6],
    borderStrong: scales.neutral[7],
    /**
     * Кольцо фокуса. Ступень 8 для этого слишком светлая — индикатор фокуса
     * обязан держать 3:1 к фону (WCAG 2.2, SC 1.4.11), а она даёт 1.8.
     */
    focusRing: scales.accent[9],

    text: scales.neutral[12],
    textMuted: scales.neutral[11],
    /**
     * Выключенный элемент. Контраст здесь намеренно ниже AA — WCAG выводит
     * такие элементы из-под требования, — но не настолько, чтобы кнопка
     * исчезала с подложки: ступень 8 для этого слишком светлая.
     */
    textDisabled: scales.neutral[9],

    /** Затемнение под шитом и модалкой. */
    overlay: 'rgba(9, 11, 13, 0.55)',

    neutral: tone(scales.neutral),
    accent: tone(scales.accent),
    success: tone(scales.success),
    warning: tone(scales.warning),
    danger: tone(scales.danger),
  },
  elevation: {
    none: 'none',
    low: '0 1px 2px rgba(16, 24, 32, 0.06), 0 1px 1px rgba(16, 24, 32, 0.04)',
    medium: '0 4px 12px -4px rgba(16, 24, 32, 0.12), 0 2px 4px -2px rgba(16, 24, 32, 0.06)',
    high: '0 16px 32px -12px rgba(16, 24, 32, 0.2), 0 4px 8px -4px rgba(16, 24, 32, 0.08)',
  },
} as const;

export type Theme = typeof theme;
/** Смысловые семейства, из которых компонент выбирает тон. */
export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
