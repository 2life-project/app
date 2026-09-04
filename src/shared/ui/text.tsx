import { Text as RNText, StyleSheet, type TextProps as RNTextProps } from 'react-native';

import { fontFamily, textVariant, theme, type TextVariant, type Tone } from '@/shared/theme';

/** Роль текста по смыслу, а не по цвету. `onX` — подпись поверх заливки семейства. */
type TextTone =
  | 'default'
  | 'muted'
  | 'disabled'
  | Tone
  | 'onNeutral'
  | 'onAccent'
  | 'onHighlight'
  | 'onSuccess'
  | 'onWarning'
  | 'onDanger';

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  tone?: TextTone;
};

/**
 * Единственный способ вывести текст. `fontSize` в продуктовом коде не пишут:
 * нужен другой размер — добавляется роль в `textVariant`.
 */
export function Text({ variant = 'body', tone = 'default', style, ...rest }: TextProps) {
  return <RNText {...rest} style={[styles.base, textVariant[variant], styles[tone], style]} />;
}

const styles = StyleSheet.create({
  // Без flexShrink текст в строке не сжимается: в RN, в отличие от веба,
  // значение по умолчанию 0, и при системном увеличении шрифта строка
  // вылезает за карточку вместо переноса.
  base: { fontFamily: fontFamily.sans, flexShrink: 1 },
  default: { color: theme.color.text },
  muted: { color: theme.color.textMuted },
  disabled: { color: theme.color.textDisabled },
  neutral: { color: theme.color.neutral.text },
  accent: { color: theme.color.accent.text },
  highlight: { color: theme.color.highlight.text },
  success: { color: theme.color.success.text },
  warning: { color: theme.color.warning.text },
  danger: { color: theme.color.danger.text },
  onNeutral: { color: theme.color.neutral.on },
  onAccent: { color: theme.color.accent.on },
  onHighlight: { color: theme.color.highlight.on },
  onSuccess: { color: theme.color.success.on },
  onWarning: { color: theme.color.warning.on },
  onDanger: { color: theme.color.danger.on },
});
