import { Platform, type TextStyle } from 'react-native';

/**
 * Первый уровень токенов — сырые шкалы. Значений «на глаз» здесь нет:
 * размеры идут шагом 4pt, кегли — по модульной шкале, длительности —
 * по бакетам Material 3. Цвет живёт отдельно, в `palette.gen.ts`.
 *
 * Компоненты сюда не ходят напрямую за цветом: цвет берут ролью из `theme`.
 */

/** Шаг сетки 4pt: он же минимальный шаг у iOS HIG и Material. */
export const space = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

export const radius = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const size = {
  /** Минимальная зона нажатия: 44pt у Apple, 48dp у Material. */
  tapTarget: Platform.select({ ios: 44, default: 48 }),
  border: Platform.select({ ios: 0.5, default: 1 }),
  icon: { sm: 16, md: 20, lg: 24 },
} as const;

export const fontFamily = {
  /**
   * Системная гарнитура. Своя означала бы загрузку при старте, отдельный
   * лицензионный вопрос и потерю системных начертаний для крупного текста;
   * пока дизайн не потребует конкретную — берём платформенную.
   */
  sans: Platform.select({ ios: 'System', android: 'sans-serif', default: 'system-ui' }),
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/** Цифры в метриках не должны прыгать при смене значения. */
export const tabularNumbers = { fontVariant: ['tabular-nums'] } satisfies TextStyle;

/**
 * Роли текста (имя `variant`, потому что `role` у RN Text занят доступностью). Кегли — шкала с шагом ≈1.2 от базовых 16pt; межстрочное
 * от 1.2 у крупного до 1.5 у основного, трекинг отрицательный только на
 * крупных, где буквы иначе разъезжаются.
 */
export const textVariant = {
  display: { fontSize: 34, lineHeight: 41, fontWeight: fontWeight.bold, letterSpacing: -0.5 },
  headline: { fontSize: 28, lineHeight: 34, fontWeight: fontWeight.bold, letterSpacing: -0.3 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: fontWeight.semibold, letterSpacing: -0.2 },
  subtitle: { fontSize: 17, lineHeight: 24, fontWeight: fontWeight.semibold },
  body: { fontSize: 16, lineHeight: 24, fontWeight: fontWeight.regular },
  bodySmall: { fontSize: 14, lineHeight: 20, fontWeight: fontWeight.regular },
  label: { fontSize: 13, lineHeight: 18, fontWeight: fontWeight.medium },
  caption: { fontSize: 11, lineHeight: 16, fontWeight: fontWeight.medium, letterSpacing: 0.3 },
  metric: { fontSize: 30, lineHeight: 34, fontWeight: fontWeight.bold, ...tabularNumbers },
} satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof textVariant;

/** Длительности по бакетам Material 3; всё, что дольше, читается как лаг. */
export const duration = {
  instant: 100,
  quick: 150,
  base: 250,
  slow: 400,
} as const;

/** Кривые Material 3: вход быстрый, остановка мягкая. */
export const easing = {
  standard: [0.2, 0, 0, 1],
  decelerate: [0, 0, 0, 1],
  accelerate: [0.3, 0, 1, 1],
} as const;

/** Пресеты пружин для Reanimated — там, где важнее физика, а не длительность. */
export const spring = {
  gentle: { damping: 20, stiffness: 180, mass: 1 },
  snappy: { damping: 26, stiffness: 320, mass: 0.9 },
} as const;
