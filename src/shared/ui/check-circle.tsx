import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';

import { radius, size, theme } from '@/shared/theme';

export type CheckCircleProps = {
  checked: boolean;
};

/** Отметка выполнения: залитый кружок против пустого контура. */
export function CheckCircle({ checked }: CheckCircleProps) {
  return (
    <View style={[styles.base, checked ? styles.checked : styles.empty]}>
      {checked ? <Feather name="check" size={size.icon.sm} color={theme.color.success.on} /> : null}
    </View>
  );
}

const CIRCLE = 26;

const styles = StyleSheet.create({
  base: {
    width: CIRCLE,
    height: CIRCLE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  checked: { backgroundColor: theme.color.success.solid },
  empty: { borderWidth: 1.5, borderColor: theme.color.borderStrong },
});
