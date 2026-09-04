import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { radius, size, space, theme, type Tone } from '@/shared/theme';

import { Text } from './text';

/** По Material 3: заливка, мягкая плашка, только подпись. */
type Variant = 'filled' | 'tonal' | 'plain';

/** Кегль подписи кнопки — одной строкой, чтобы правка макета была правкой здесь. */
const LABEL_VARIANT = 'label';

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: Variant;
  /** `danger` для необратимых действий, `accent` для основного. */
  tone?: Tone;
};

export function Button({
  label,
  variant = 'filled',
  tone = 'accent',
  disabled,
  ...rest
}: ButtonProps) {
  const palette = theme.color[tone];

  const background = { filled: palette.solid, tonal: palette.surface, plain: 'transparent' }[
    variant
  ];
  const pressedBackground = {
    filled: palette.solidPressed,
    tonal: palette.surfacePressed,
    plain: palette.surface,
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        variant === 'tonal' && { borderColor: palette.border },
        { backgroundColor: pressed ? pressedBackground : background },
        // Гасить прозрачностью нельзя: RN складывает opacity на всё поддерево,
        // и проверенная пара подпись/заливка 4.5:1 превращается в 1.9:1,
        // а жёлтая кнопка пропадает с карточки совсем.
        disabled && styles.disabled,
      ]}>
      <Text
        variant={LABEL_VARIANT}
        tone={disabled ? 'disabled' : labelTone[variant](tone)}
        numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const onTone = {
  neutral: 'onNeutral',
  accent: 'onAccent',
  success: 'onSuccess',
  warning: 'onWarning',
  danger: 'onDanger',
} as const;

const labelTone = {
  filled: (tone: Tone) => onTone[tone],
  tonal: (tone: Tone) => tone,
  plain: (tone: Tone) => tone,
} as const;

const styles = StyleSheet.create({
  base: {
    minHeight: size.tapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderRadius: radius.full,
    borderWidth: size.border,
    borderColor: 'transparent',
  },
  disabled: { backgroundColor: theme.color.surfaceSunken, borderColor: theme.color.border },
});
