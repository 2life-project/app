import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { color, hitSize, radius, shadow, spacing } from '@/shared/theme';

import { Text } from './text';

type Variant = 'primary' | 'secondary' | 'ghost';

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: Variant;
};

export function Button({ label, variant = 'primary', disabled, ...rest }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <Text variant="label" tone={variant === 'primary' ? 'onAccent' : 'accent'}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: hitSize,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
  },
  primary: { backgroundColor: color.accent, boxShadow: shadow.float },
  secondary: {
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.borderStrong,
  },
  ghost: { backgroundColor: 'transparent' },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.4 },
});
