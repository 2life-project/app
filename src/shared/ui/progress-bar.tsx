import { StyleSheet, View } from 'react-native';

import { radius, theme, type Tone } from '@/shared/theme';

export type ProgressBarProps = {
  /** Доля заполнения от 0 до 1. */
  value: number;
  tone?: Extract<Tone, 'success' | 'warning' | 'danger' | 'highlight'>;
};

/** Полоса прогресса протокола или цели. */
export function ProgressBar({ value, tone = 'success' }: ProgressBarProps) {
  const filled = `${Math.max(0, Math.min(1, value)) * 100}%` as const;

  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: filled, backgroundColor: theme.color[tone].solid }]} />
    </View>
  );
}

const HEIGHT = 6;

const styles = StyleSheet.create({
  track: {
    height: HEIGHT,
    borderRadius: radius.full,
    backgroundColor: theme.color.neutral.surface,
    overflow: 'hidden',
  },
  fill: { height: HEIGHT, borderRadius: radius.full },
});
