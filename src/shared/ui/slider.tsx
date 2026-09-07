import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { radius, theme } from '@/shared/theme';

export type SliderProps = {
  value: number;
  minimum: number;
  maximum: number;
  onChange: (value: number) => void;
  accessibilityLabel: string;
};

/**
 * Шкала ответа: тянут ручку или касаются дорожки. Считается на UI-потоке,
 * поэтому ручка идёт за пальцем без задержки; наружу отдаётся уже целое
 * значение шкалы — ответ «7.3 из 10» ничего не означает.
 */
export function Slider({ value, minimum, maximum, onChange, accessibilityLabel }: SliderProps) {
  const [width, setWidth] = useState(0);
  const span = Math.max(1, maximum - minimum);
  const ratio = useSharedValue((value - minimum) / span);

  const commit = (next: number) => {
    const step = Math.round(minimum + next * span);
    if (step !== value) onChange(step);
  };

  const move = (x: number) => {
    if (width <= 0) return;
    const next = Math.max(0, Math.min(1, x / width));
    ratio.set(next);
    commit(next);
  };

  const pan = Gesture.Pan()
    .onBegin((event) => move(event.x))
    .onChange((event) => move(event.x))
    .runOnJS(true);

  const tap = Gesture.Tap()
    .onEnd((event) => move(event.x))
    .runOnJS(true);

  const fill = useAnimatedStyle(() => ({ width: `${ratio.get() * 100}%` }));
  const knob = useAnimatedStyle(() => ({ left: `${ratio.get() * 100}%` }));

  return (
    <GestureDetector gesture={Gesture.Race(pan, tap)}>
      <View
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ min: minimum, max: maximum, now: value }}
        style={styles.track}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        <View style={styles.rail} />
        <Animated.View style={[styles.fill, fill]} />
        <Animated.View style={[styles.knob, knob]} />
      </View>
    </GestureDetector>
  );
}

const TRACK = 12;
const KNOB = 26;

const styles = StyleSheet.create({
  track: {
    height: KNOB,
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  rail: {
    height: TRACK,
    borderRadius: radius.full,
    backgroundColor: theme.color.surfaceSunken,
  },
  fill: {
    position: 'absolute',
    left: 0,
    height: TRACK,
    borderRadius: radius.full,
    backgroundColor: theme.color.highlight.solid,
  },
  knob: {
    position: 'absolute',
    width: KNOB,
    height: KNOB,
    marginLeft: -KNOB / 2,
    borderRadius: radius.full,
    backgroundColor: theme.color.surface,
    borderWidth: 2,
    borderColor: theme.color.highlight.solid,
  },
});
