import { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { radius, size, space, theme, type Tone } from '@/shared/theme';

import { Text } from './text';

/** По Material 3: заливка, мягкая плашка, только подпись. */
type Variant = 'filled' | 'tonal' | 'plain' | 'dashed';

/** Кегль подписи кнопки — одной строкой, чтобы правка макета была правкой здесь. */
const LABEL_VARIANT = 'label';

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: Variant;
  /** `sm` — пилюля внутри строки списка, `md` — обычная кнопка. */
  size?: 'sm' | 'md';
  /** `danger` для необратимых действий, `accent` для основного. */
  tone?: Tone;
  /**
   * Действие в работе. Кнопка перестаёт нажиматься сама: без этого второе
   * нажатие уходит вторым запросом, а вход и регистрация не идемпотентны.
   */
  loading?: boolean;
  /** Значок слева от подписи — там, где кнопка называет источник входа. */
  icon?: ReactNode;
};

export function Button({
  label,
  variant = 'filled',
  size: sizeProp = 'md',
  tone = 'accent',
  disabled,
  loading = false,
  icon,
  ...rest
}: ButtonProps) {
  const palette = theme.color[tone];
  const off = disabled || loading;

  const background = {
    filled: palette.solid,
    tonal: palette.surface,
    plain: 'transparent',
    dashed: 'transparent',
  }[variant];
  const pressedBackground = {
    filled: palette.solidPressed,
    tonal: palette.surfacePressed,
    plain: palette.surface,
    dashed: palette.surface,
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy: loading }}
      disabled={off}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        sizeProp === 'sm' && styles.small,
        variant === 'tonal' && { borderColor: palette.border },
        variant === 'dashed' && { borderColor: palette.border, borderStyle: 'dashed' },
        { backgroundColor: pressed ? pressedBackground : background },
        // Гасить прозрачностью нельзя: RN складывает opacity на всё поддерево,
        // и проверенная пара подпись/заливка 4.5:1 превращается в 1.9:1,
        // а жёлтая кнопка пропадает с карточки совсем.
        off && styles.disabled,
      ]}>
      <View style={styles.row}>
        {loading ? <ActivityIndicator size="small" color={theme.color.textDisabled} /> : icon}
        <Text
          variant={LABEL_VARIANT}
          tone={off ? 'disabled' : labelTone[variant](tone)}
          numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const onTone = {
  neutral: 'onNeutral',
  accent: 'onAccent',
  highlight: 'onHighlight',
  success: 'onSuccess',
  warning: 'onWarning',
  danger: 'onDanger',
} as const;

const labelTone = {
  filled: (tone: Tone) => onTone[tone],
  tonal: (tone: Tone) => tone,
  plain: (tone: Tone) => tone,
  dashed: (tone: Tone) => tone,
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
  small: { minHeight: 34, paddingHorizontal: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  disabled: { backgroundColor: theme.color.surfaceSunken, borderColor: theme.color.borderStrong },
});
