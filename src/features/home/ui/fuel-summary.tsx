import { StyleSheet, View } from 'react-native';

import { space } from '@/shared/theme';
import { ProgressBar, Text } from '@/shared/ui';

import type { MacroCell } from '../model/nutrition';

/**
 * Итог дня по питанию: одно число и четыре полосы.
 *
 * Цифры макросов сняты намеренно. Они отвечают на вопрос «сколько именно», а
 * он возникает, когда человек решает, что съесть, — и тогда он уже в разделе.
 * На Главной нужен другой ответ: насколько заполнено, — и его даёт полоса.
 *
 * Подписи оставлены: закодировать макросы цветом нельзя, цвет в приложении
 * означает отклонение от нормы, а не категорию.
 */
export function FuelSummary({
  cells,
  detailed = false,
}: {
  cells: readonly MacroCell[];
  detailed?: boolean;
}) {
  const [calories, ...macros] = cells;
  if (!calories) return null;

  return (
    <View style={styles.root}>
      <Text variant="headline">{calories.text}</Text>
      <ProgressBar value={calories.fill ?? 0} tone={calories.tone} />

      <View style={styles.macros}>
        {macros.map((macro) => (
          <View key={macro.id} style={styles.macro}>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {macro.label.toUpperCase()}
            </Text>
            {/* В разделе числа нужны: там решают, что съесть дальше. */}
            {detailed ? (
              <Text variant="footnote" numberOfLines={1}>
                {macro.text}
              </Text>
            ) : null}
            <ProgressBar value={macro.fill ?? 0} tone={macro.tone} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.sm },
  macros: { flexDirection: 'row', gap: space.md, marginTop: space.sm },
  macro: { flex: 1, gap: space.xs },
});
