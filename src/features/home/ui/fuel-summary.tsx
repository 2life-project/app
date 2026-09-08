import { StyleSheet, View } from 'react-native';

import { space } from '@/shared/theme';
import { ProgressBar, ProgressRing, Text } from '@/shared/ui';

import type { NutritionView } from '../model/nutrition';

/**
 * Сводка дня по питанию.
 *
 * В центре — «осталось», а не «съедено»: экран открывают, чтобы понять,
 * сколько ещё можно, и это число не должно требовать вычитания. По бокам от
 * кольца стоят слагаемые баланса, чтобы главное число не выглядело взявшимся
 * ниоткуда.
 *
 * Макросы — тремя колонками под кольцом. Короткая полоса точной доли не даёт,
 * поэтому под ней стоит число; работает это только потому, что макросы здесь
 * вторые, а не главные.
 */
export function FuelSummary({ view }: { view: NutritionView }) {
  const { balance } = view;

  return (
    <View style={styles.root}>
      <View style={styles.balance}>
        <View style={styles.side}>
          <Text variant="subtitle">{balance.eaten}</Text>
          <Text variant="caption" tone="muted">
            {EATEN}
          </Text>
        </View>

        <ProgressRing
          size={RING}
          value={balance.fill}
          valueLabel={balance.left}
          valueVariant="headline"
          note={LEFT}
        />

        <View style={styles.side}>
          <Text variant="subtitle">{balance.burned}</Text>
          <Text variant="caption" tone="muted">
            {BURNED}
          </Text>
        </View>
      </View>

      <View style={styles.macros}>
        {view.grid.slice(1).map((macro) => (
          <View key={macro.id} style={styles.macro}>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {macro.label.toUpperCase()}
            </Text>
            <ProgressBar value={macro.fill ?? 0} tone={macro.tone} />
            <Text variant="footnote" tone="muted" numberOfLines={1}>
              {macro.text}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const EATEN = 'EATEN';
const LEFT = 'left';
const BURNED = 'BURNED';
const RING = 116;

const styles = StyleSheet.create({
  root: { gap: space.lg },
  balance: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  side: { alignItems: 'center', gap: space.xs, flex: 1 },
  macros: { flexDirection: 'row', gap: space.md },
  macro: { flex: 1, gap: space.xs },
});
