import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';

import { size, space, theme } from '@/shared/theme';

import { Pressable } from './pressable';
import { Text } from './text';

export type SummaryRowProps = {
  title: string;
  subtitle?: string;
  value: string;
  onPress?: () => void;
  /** Разделитель сверху: строки внутри карточки разделены волосяной линией. */
  divider?: boolean;
};

/** Строка сводки внутри карточки: подпись слева, значение справа. */
export function SummaryRow({ title, subtitle, value, onPress, divider = false }: SummaryRowProps) {
  const body = (
    <View style={[styles.row, divider && styles.divider]}>
      <View style={styles.body}>
        <Text variant="body">{title}</Text>
        {subtitle ? (
          <Text variant="bodySmall" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Text variant="body">{value}</Text>
      {onPress ? (
        <Feather name="chevron-right" size={size.icon.md} color={theme.color.textDisabled} />
      ) : null}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable haptic={false} scaleTo={0.99} onPress={onPress}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.color.border },
  body: { flex: 1, gap: 2 },
});
