import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import {
  Pressable as RNPressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type AnimatedStyle,
} from 'react-native-reanimated';

import { duration, easing } from '@/shared/theme';

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

/** Кривая из токенов, переведённая в форму, понятную Reanimated. */
const CURVE = Easing.bezier(...easing.standard);

export type PressableScaleProps = Omit<PressableProps, 'style'> & {
  /** Насколько сжимается кнопка под пальцем. */
  scaleTo?: number;
  /** Лёгкий отклик на нажатие. Выключать там, где тап и так даёт системный. */
  haptic?: boolean;
  style?: StyleProp<AnimatedStyle<ViewStyle>>;
};

/**
 * Нажатие с отдачей: масштаб анимируется на UI-потоке, поэтому не проседает,
 * когда JS занят. Заменяет россыпь `({ pressed }) => opacity` по экранам —
 * прозрачность выглядит как подвисание, а не как нажатие.
 */
export function Pressable({
  scaleTo = 0.95,
  haptic = true,
  onPressIn,
  onPressOut,
  style,
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const handlePressIn = useCallback<NonNullable<PressableProps['onPressIn']>>(
    (event) => {
      scale.set(withTiming(scaleTo, { duration: duration.instant, easing: CURVE }));
      if (haptic) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPressIn?.(event);
    },
    [haptic, onPressIn, scale, scaleTo],
  );

  const handlePressOut = useCallback<NonNullable<PressableProps['onPressOut']>>(
    (event) => {
      scale.set(withTiming(1, { duration: duration.quick, easing: CURVE }));
      onPressOut?.(event);
    },
    [onPressOut, scale],
  );

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animated, style]}
    />
  );
}
