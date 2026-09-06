import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';

import { radius, theme } from '@/shared/theme';

export type CheckCircleProps = {
  checked: boolean;
  /** Крупный кружок — когда отметка сама и есть содержимое экрана. */
  size?: number;
};

/** Отметка выполнения: залитый кружок против пустого контура. */
export function CheckCircle({ checked, size: box = CIRCLE }: CheckCircleProps) {
  return (
    <View
      style={[styles.base, { width: box, height: box }, checked ? styles.checked : styles.empty]}>
      {checked ? (
        <Feather name="check" size={Math.round(box * 0.58)} color={theme.color.success.on} />
      ) : null}
    </View>
  );
}

const CIRCLE = 26;

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  checked: { backgroundColor: theme.color.success.solid },
  empty: { borderWidth: 1.5, borderColor: theme.color.borderStrong },
});
