import { StyleSheet, View } from 'react-native';

import { space, type Tone } from '@/shared/theme';

import { ProgressRing } from './progress-ring';
import { Stack } from './stack';
import { Text } from './text';

export type MacroCellProps = {
  id: string;
  label: string;
  /** Готовая подпись «1 000 / 2 300 kcal». Единицу подставляет вызывающий. */
  text: string;
  fill: number | null;
  tone?: Extract<Tone, 'success' | 'warning' | 'danger' | 'highlight'>;
};

export type MacroGridProps = { cells: readonly MacroCellProps[] };

/**
 * Четыре числа дня сеткой два на два: кольцо, название, «съедено из цели».
 * Одно число живёт в одном месте — до этого калории стояли и в кольце, и в
 * остатке, и в полосе, и человеку приходилось сверять их между собой.
 */
export function MacroGrid({ cells }: MacroGridProps) {
  return (
    <View style={styles.grid}>
      {cells.map((cell) => (
        <View key={cell.id} style={styles.cell}>
          <ProgressRing
            size={RING}
            thickness={THICKNESS}
            value={cell.fill}
            valueLabel=""
            tone={cell.tone === 'highlight' ? undefined : cell.tone}
          />
          <Stack gap="none" style={styles.text}>
            <Text variant="label" numberOfLines={1}>
              {cell.label}
            </Text>
            <Text variant="bodySmall" tone="muted" numberOfLines={1}>
              {cell.text}
            </Text>
          </Stack>
        </View>
      ))}
    </View>
  );
}

const RING = 36;
const THICKNESS = 4;

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space.lg, columnGap: space.sm },
  cell: { flexDirection: 'row', alignItems: 'center', gap: space.sm, width: '47%' },
  text: { flex: 1 },
});
