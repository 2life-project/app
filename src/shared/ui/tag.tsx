import { StyleSheet, View } from 'react-native';

import { radius, size, space, theme, type Tone } from '@/shared/theme';

import { Text } from './text';

export type TagProps = {
  label: string;
  tone?: Tone;
  /** Точка перед подписью: цвет несёт статус, подпись — смысл. */
  dot?: boolean;
};

/** Короткая метка смысла: статус показателя, состояние загрузки. */
export function Tag({ label, tone = 'neutral', dot = false }: TagProps) {
  return (
    <View style={[styles.base, styles[tone]]}>
      {dot ? <View style={[styles.dot, { backgroundColor: theme.color[tone].solid }]} /> : null}
      <Text variant="caption" tone={tone}>
        {label}
      </Text>
    </View>
  );
}

const DOT = 6;

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    borderWidth: size.border,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
  },
  dot: { width: DOT, height: DOT, borderRadius: radius.full },
  neutral: {
    backgroundColor: theme.color.neutral.surface,
    borderColor: theme.color.neutral.border,
  },
  accent: { backgroundColor: theme.color.accent.surface, borderColor: theme.color.accent.border },
  highlight: {
    backgroundColor: theme.color.highlight.surface,
    borderColor: theme.color.highlight.border,
  },
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
