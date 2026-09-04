import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { radius, size, space, theme } from '@/shared/theme';

import { Text } from './text';

export type SegmentedProps<T extends string> = {
  items: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

/**
 * Суб-навигация внутри раздела: горизонтальный ряд чипов. Разделы длиннее
 * экрана, поэтому ряд скроллится, а не сжимается.
 */
export function Segmented<T extends string>({ items, value, onChange }: SegmentedProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      {items.map((item) => {
        const active = item.value === value;

        return (
          <Pressable
            key={item.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(item.value)}
            style={[styles.chip, active && styles.chipActive]}>
            <Text variant="label" tone={active ? 'default' : 'muted'}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.xs, paddingRight: space.lg },
  chip: {
    minHeight: size.tapTarget,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderRadius: radius.full,
  },
  chipActive: { backgroundColor: theme.color.surface },
});
