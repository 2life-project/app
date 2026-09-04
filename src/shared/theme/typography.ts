import { Platform, type TextStyle } from 'react-native';

/**
 * Шрифт. Веб живёт на Segoe UI / Frutiger — на телефоне такого нет, и тянуть
 * веб-шрифт ради похожести неправильно: системный даёт нативный ритм,
 * динамический размер и нулевую загрузку.
 *
 * Если дизайн зафиксирует конкретную гарнитуру (обсуждался Source Sans 3) —
 * меняются ровно эти две строки плюс загрузка через `expo-font`.
 */
export const fontFamily = {
  ui: Platform.select({ ios: 'System', android: 'sans-serif', default: 'system-ui' }),
  /** Цифры в метриках: тот же шрифт, но моноширинные цифры — см. `numericStyle`. */
  numeric: Platform.select({ ios: 'System', android: 'sans-serif', default: 'system-ui' }),
} as const;

/** Колонки цифр не должны «дышать» при смене значения. */
export const numericStyle = { fontVariant: ['tabular-nums'] } satisfies TextStyle;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/**
 * Именованные роли текста. Компонент `<Text variant="...">` умеет только их —
 * произвольные fontSize в продуктовом коде запрещены (см. AGENTS.md).
 */
export const textVariant = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: fontWeight.bold, letterSpacing: -0.4 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: fontWeight.semibold, letterSpacing: -0.2 },
  subtitle: { fontSize: 17, lineHeight: 24, fontWeight: fontWeight.semibold },
  body: { fontSize: 15, lineHeight: 22, fontWeight: fontWeight.regular },
  label: { fontSize: 13, lineHeight: 18, fontWeight: fontWeight.medium },
  caption: { fontSize: 11, lineHeight: 15, fontWeight: fontWeight.medium, letterSpacing: 0.2 },
  /** Крупное число в кольце/плитке. */
  metric: { fontSize: 28, lineHeight: 32, fontWeight: fontWeight.bold, ...numericStyle },
} satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof textVariant;
