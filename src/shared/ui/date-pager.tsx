import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';

import { radius, size, space, theme } from '@/shared/theme';

import { Pressable } from './pressable';
import { Text } from './text';

export type DatePagerProps = {
  label: string;
  onPrev?: () => void;
  onNext?: () => void;
};

/** Переключатель дня над содержимым раздела: ‹ Сегодня · 13 июля › */
export function DatePager({ label, onPrev, onNext }: DatePagerProps) {
  return (
    <View style={styles.bar}>
      <Pressable haptic={false} accessibilityLabel="Предыдущий день" onPress={onPrev}>
        <Feather name="chevron-left" size={size.icon.md} color={theme.color.textMuted} />
      </Pressable>
      <Text variant="body">{label}</Text>
      <Pressable haptic={false} accessibilityLabel="Следующий день" onPress={onNext}>
        <Feather name="chevron-right" size={size.icon.md} color={theme.color.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: size.tapTarget,
    paddingHorizontal: space.lg,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: theme.color.surfaceEdge,
    backgroundColor: theme.color.surface,
  },
});
