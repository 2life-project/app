import { Text as RNText, StyleSheet, type TextProps as RNTextProps } from 'react-native';

import { color, fontFamily, textVariant, type TextVariant } from '@/shared/theme';

type Tone = 'default' | 'soft' | 'faint' | 'accent' | 'onAccent';

const tone: Record<Tone, string> = {
  default: color.text,
  soft: color.textSoft,
  faint: color.textFaint,
  accent: color.accent,
  onAccent: color.textOnAccent,
};

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  tone?: Tone;
};

/** Единственный способ вывести текст. `fontSize` в продуктовом коде не пишут. */
export function Text({ variant = 'body', tone: toneName = 'default', style, ...rest }: TextProps) {
  return (
    <RNText
      {...rest}
      style={[styles.base, textVariant[variant], { color: tone[toneName] }, style]}
    />
  );
}

const styles = StyleSheet.create({
  base: { fontFamily: fontFamily.ui },
});
