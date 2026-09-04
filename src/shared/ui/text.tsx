import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import {
  createThemedStyles,
  fontFamily,
  textVariant,
  type TextVariant,
  type Tone,
} from '@/shared/theme';

/** Роль текста по смыслу, а не по цвету: «приглушённый», «ошибка». */
type TextTone = 'default' | 'muted' | 'disabled' | Tone;

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  tone?: TextTone;
};

/**
 * Единственный способ вывести текст. `fontSize` в продуктовом коде не пишут:
 * нужен другой размер — добавляется роль в `textVariant`.
 */
export function Text({ variant = 'body', tone = 'default', style, ...rest }: TextProps) {
  const styles = useStyles();

  return <RNText {...rest} style={[styles.base, textVariant[variant], styles[tone], style]} />;
}

const useStyles = createThemedStyles((theme) => ({
  base: { fontFamily: fontFamily.sans },
  default: { color: theme.color.text },
  muted: { color: theme.color.textMuted },
  disabled: { color: theme.color.textDisabled },
  neutral: { color: theme.color.neutral.text },
  accent: { color: theme.color.accent.text },
  success: { color: theme.color.success.text },
  warning: { color: theme.color.warning.text },
  danger: { color: theme.color.danger.text },
}));
