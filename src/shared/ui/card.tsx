import { StyleSheet, View, type ViewProps } from 'react-native';

import { radius, space, theme } from '@/shared/theme';

export type CardProps = ViewProps & {
  padding?: keyof typeof space;
  /** `raised` отрывается от страницы тенью, `sunken` — углубление под контент. */
  variant?: 'flat' | 'raised' | 'sunken';
};

export function Card({ padding, variant = 'raised', style, ...rest }: CardProps) {
  const inset =
    padding === undefined
      ? { paddingVertical: space.cardY, paddingHorizontal: space.cardX }
      : { padding: space[padding] };

  return <View {...rest} style={[styles.base, styles[variant], inset, style]} />;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: theme.color.surfaceEdge,
  },
  flat: { backgroundColor: theme.color.surface },
  raised: { backgroundColor: theme.color.surface, boxShadow: theme.elevation.card },
  sunken: { backgroundColor: theme.color.surfaceSunken, borderColor: 'transparent' },
});
