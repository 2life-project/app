import { StyleSheet, View } from 'react-native';

import { color, radius, spacing, type StatusTone } from '@/shared/theme';

import { Text } from './text';

export type TagProps = {
  label: string;
  tone?: StatusTone | 'neutral';
};

export function Tag({ label, tone = 'neutral' }: TagProps) {
  const paint =
    tone === 'neutral'
      ? { backgroundColor: color.surfaceSunken, color: color.textSoft }
      : { backgroundColor: color.status[tone].soft, color: color.status[tone].deep };

  return (
    <View style={[styles.base, { backgroundColor: paint.backgroundColor }]}>
      <Text variant="caption" style={{ color: paint.color }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
