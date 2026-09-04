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
  /** Поле экрана — из макета. */
  screen: 14,
  /** Вертикальное поле карточки — из макета. */
  cardY: 15,
  /** Горизонтальное поле карточки — из макета. */
  cardX: 16,
  /** Зазор между строками внутри виджета — из макета. */
  widget: 10,
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
  display: { fontSize: 30, lineHeight: 34, fontWeight: fontWeight.bold, letterSpacing: -0.4 },
  headline: { fontSize: 24, lineHeight: 30, fontWeight: fontWeight.bold, letterSpacing: -0.3 },
  title: { fontSize: 20, lineHeight: 26, fontWeight: fontWeight.semibold, letterSpacing: -0.2 },
  subtitle: { fontSize: 17, lineHeight: 22, fontWeight: fontWeight.bold },
  body: { fontSize: 15, lineHeight: 20, fontWeight: fontWeight.regular },
  bodySmall: { fontSize: 13, lineHeight: 16, fontWeight: fontWeight.regular },
  label: { fontSize: 13, lineHeight: 15, fontWeight: fontWeight.medium },
  caption: { fontSize: 11, lineHeight: 14, fontWeight: fontWeight.bold, letterSpacing: 0.66 },
  /** Ссылка-действие в шапке виджета. */
  link: { fontSize: 12.5, lineHeight: 15, fontWeight: fontWeight.semibold },
  /** Число внутри кольца и в плитке показателя. */
  ringValue: { fontSize: 15, lineHeight: 18, fontWeight: fontWeight.bold, ...tabularNumbers },
  /** Пояснение под значением: «из 8:00», «база 62». */
  footnote: { fontSize: 11, lineHeight: 14, fontWeight: fontWeight.semibold },
  metric: { fontSize: 20, lineHeight: 24, fontWeight: fontWeight.semibold, ...tabularNumbers },
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
