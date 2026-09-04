/** Шаг сетки 4pt. Отступы в продуктовом коде берутся только отсюда. */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Скругления один-в-один с вебом. */
export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 34,
  pill: 999,
} as const;

/**
 * Тени. RN 0.86 понимает CSS-строку `boxShadow` на всех платформах, поэтому
 * тени переносятся из веба дословно, без пары iOS/Android-веток.
 */
export const shadow = {
  panel: '0 10px 24px -18px rgba(3, 45, 75, 0.45), 0 1px 3px rgba(3, 45, 75, 0.06)',
  float: '0 8px 18px -12px rgba(3, 45, 75, 0.35)',
  lift: '0 18px 40px -20px rgba(3, 45, 75, 0.55), 0 2px 6px rgba(3, 45, 75, 0.08)',
} as const;

/** Горизонтальные поля экрана — одно значение на всё приложение. */
export const screenPadding = spacing.lg;

/** Минимальная зона нажатия: ниже 44pt тап промахивается. */
export const hitSize = 44;
