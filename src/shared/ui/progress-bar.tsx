import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { duration, easing, radius, theme, type Tone } from '@/shared/theme';

const CURVE = Easing.bezier(...easing.decelerate);

export type ProgressBarProps = {
  /** Доля заполнения от 0 до 1. */
  value: number;
  tone?: Extract<Tone, 'success' | 'warning' | 'danger' | 'highlight'>;
};

/** Полоса прогресса протокола или цели. */
export function ProgressBar({ value, tone = 'success' }: ProgressBarProps) {
  const target = Math.max(0, Math.min(1, value));
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(withTiming(target, { duration: duration.slow, easing: CURVE }));
  }, [progress, target]);

  const fill = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, fill, { backgroundColor: theme.color[tone].solid }]} />
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
