import { StyleSheet, View, type ViewProps } from 'react-native';

import { color, radius, shadow, spacing } from '@/shared/theme';

export type CardProps = ViewProps & {
  padding?: keyof typeof spacing;
  /** `glass` — полупрозрачная плашка поверх фона, `solid` — непрозрачная карточка. */
  tone?: 'solid' | 'glass';
};

export function Card({ padding = 'lg', tone = 'solid', style, ...rest }: CardProps) {
  return (
    <View {...rest} style={[styles.base, styles[tone], { padding: spacing[padding] }, style]} />
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.surfaceEdge,
    boxShadow: shadow.panel,
  },
  solid: { backgroundColor: color.surface },
  glass: { backgroundColor: color.surfaceGlass },
});
