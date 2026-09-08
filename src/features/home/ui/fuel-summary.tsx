import { StyleSheet, View } from 'react-native';

import { space } from '@/shared/theme';
import { ProgressBar, Text } from '@/shared/ui';

import type { MacroCell } from '../model/nutrition';

/**
 * Итог дня по питанию. Одно главное число — калории, под ним три макроса
 * колонками: название, «съедено из цели», полоса.
 *
 * Колец здесь нет намеренно. Кольцо работает, когда оно одно и в нём написано
 * число; четыре пустых кольца в ряд не несут ни величины, ни подписи — глаз
 * читает их как украшение и всё равно идёт искать цифры.
 */
export function FuelSummary({ cells }: { cells: readonly MacroCell[] }) {
  const [calories, ...macros] = cells;
  if (!calories) return null;

  return (
    <View style={styles.root}>
      <View style={styles.headline}>
        <Text variant="headline">{calories.text}</Text>
        <Text variant="caption" tone="muted">
          {calories.label.toUpperCase()}
        </Text>
      </View>
      <ProgressBar value={calories.fill ?? 0} tone={calories.tone} />

      <View style={styles.macros}>
        {macros.map((macro) => (
          <View key={macro.id} style={styles.macro}>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {macro.label.toUpperCase()}
            </Text>
            <Text variant="footnote" numberOfLines={1}>
              {macro.text}
            </Text>
            <ProgressBar value={macro.fill ?? 0} tone={macro.tone} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.sm },
  headline: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  macros: { flexDirection: 'row', gap: space.md, marginTop: space.sm },
  macro: { flex: 1, gap: space.xs },
});
