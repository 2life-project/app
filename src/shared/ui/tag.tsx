import { StyleSheet, View } from 'react-native';

import { radius, size, space, theme, type Tone } from '@/shared/theme';

import { Text } from './text';

export type TagProps = {
  label: string;
  tone?: Tone;
};

/** Короткая метка смысла: статус показателя, состояние загрузки. */
export function Tag({ label, tone = 'neutral' }: TagProps) {
  return (
    <View style={[styles.base, styles[tone]]}>
      <Text variant="caption" tone={tone}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    borderWidth: size.border,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
  },
  neutral: {
    backgroundColor: theme.color.neutral.surface,
    borderColor: theme.color.neutral.border,
  },
  accent: { backgroundColor: theme.color.accent.surface, borderColor: theme.color.accent.border },
  success: {
    backgroundColor: theme.color.success.surface,
    borderColor: theme.color.success.border,
  },
  warning: {
    backgroundColor: theme.color.warning.surface,
    borderColor: theme.color.warning.border,
  },
  danger: { backgroundColor: theme.color.danger.surface, borderColor: theme.color.danger.border },
});
