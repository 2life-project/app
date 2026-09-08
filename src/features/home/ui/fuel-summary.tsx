import { StyleSheet, View } from 'react-native';

import { space } from '@/shared/theme';
import { ProgressBar, Text } from '@/shared/ui';

import type { MacroCell } from '../model/nutrition';

/**
 * Итог дня по питанию: четыре одинаковые строки — калории и три макроса.
 *
 * Полосы идут во всю ширину, а не тремя колонками. Долю читают по длине, и на
 * огрызке в треть ширины она не читается — приходится искать число рядом.
 * Одинаковая длина у всех четырёх ещё и позволяет сравнивать их между собой.
 */
export function FuelSummary({ cells }: { cells: readonly MacroCell[] }) {
  if (cells.length === 0) return null;

  return (
    <View style={styles.root}>
      {cells.map((cell, index) => (
        <View key={cell.id} style={styles.row}>
          <View style={styles.head}>
            {/* Калории — заголовок дня, макросы под ними подписаны ровно. */}
            <Text
              variant={index === 0 ? 'subtitle' : 'bodySmall'}
              tone={index === 0 ? 'default' : 'muted'}>
              {cell.label}
            </Text>
            <Text variant={index === 0 ? 'subtitle' : 'bodySmall'} numberOfLines={1}>
              {cell.text}
            </Text>
          </View>
          <ProgressBar value={cell.fill ?? 0} tone={cell.tone} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: space.md },
  row: { gap: space.xs },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
});
