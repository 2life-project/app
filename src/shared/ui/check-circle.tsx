import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';

import { radius, size, theme } from '@/shared/theme';

import { Pressable } from './pressable';

export type CheckCircleProps = {
  checked: boolean;
  /** Крупный кружок — когда отметка сама и есть содержимое экрана. */
  size?: number;
  /**
   * Отметка нажимается сама, отдельно от строки. Без обработчика кружок
   * остаётся индикатором: у записанного факта нечего переключать.
   */
  onPress?: () => void;
};

/** Отметка выполнения: залитый кружок против пустого контура. */
export function CheckCircle({ checked, size: box = CIRCLE, onPress }: CheckCircleProps) {
  const circle = (
    <View
      style={[styles.base, { width: box, height: box }, checked ? styles.checked : styles.empty]}>
      {checked ? (
        <Feather name="check" size={Math.round(box * 0.58)} color={theme.color.success.on} />
      ) : null}
    </View>
  );

  if (!onPress) return circle;
  // Зона нажатия шире кружка: 26pt меньше минимальных 44pt, и промах по нему
  // на строке списка означал бы промах по соседней строке.
  return (
    <Pressable onPress={onPress} hitSlop={HIT_SLOP}>
      {circle}
    </Pressable>
  );
}

const CIRCLE = 26;
const HIT_SLOP = Math.round((size.tapTarget - CIRCLE) / 2);

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  checked: { backgroundColor: theme.color.success.solid },
  empty: { borderWidth: 1.5, borderColor: theme.color.borderStrong },
});
