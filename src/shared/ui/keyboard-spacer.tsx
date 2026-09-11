import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';

/**
 * Распорка под клавиатуру. `KeyboardAvoidingView` под edge-to-edge окном
 * экран уже не сдвигает, поэтому высоту добираем распоркой, которая следит за
 * клавиатурой на UI-потоке. Ставится последней в колонке: кнопки над ней
 * поднимаются ровно на высоту клавиатуры, а без неё уезжают под неё.
 */
export function KeyboardSpacer() {
  const keyboard = useAnimatedKeyboard();
  const style = useAnimatedStyle(() => ({ height: keyboard.height.value }));
  return <Animated.View style={style} />;
}
