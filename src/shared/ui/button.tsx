import { Pressable, type PressableProps } from 'react-native';

import { createThemedStyles, radius, size, space, useTheme, type Tone } from '@/shared/theme';

import { Text } from './text';

/** По Material 3: заливка, мягкая плашка, только подпись. */
type Variant = 'filled' | 'tonal' | 'plain';

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
  const theme = useTheme();
  const styles = useStyles();
  const palette = theme.color[tone];

  const background = {
    filled: palette.solid,
    tonal: palette.surface,
    plain: 'transparent',
  }[variant];

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
        disabled && styles.disabled,
      ]}>
      <Text variant="label" style={{ color: variant === 'filled' ? palette.on : palette.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

const useStyles = createThemedStyles(() => ({
  base: {
    minHeight: size.tapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderRadius: radius.full,
    borderWidth: size.border,
    borderColor: 'transparent',
  },
  disabled: { opacity: 0.45 },
}));
