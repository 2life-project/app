import { View, type ViewProps } from 'react-native';

import { createThemedStyles, radius, size, space } from '@/shared/theme';

export type CardProps = ViewProps & {
  padding?: keyof typeof space;
  /** `raised` отрывается от страницы тенью, `sunken` — углубление под контент. */
  variant?: 'flat' | 'raised' | 'sunken';
};

export function Card({ padding = 'lg', variant = 'raised', style, ...rest }: CardProps) {
  const styles = useStyles();

  return (
    <View {...rest} style={[styles.base, styles[variant], { padding: space[padding] }, style]} />
  );
}

const useStyles = createThemedStyles((theme) => ({
  base: {
    borderRadius: radius.lg,
    borderWidth: size.border,
    borderColor: theme.color.border,
  },
  flat: { backgroundColor: theme.color.surface },
  raised: { backgroundColor: theme.color.surface, boxShadow: theme.elevation.low },
  sunken: { backgroundColor: theme.color.surfaceSunken, borderColor: 'transparent' },
}));
