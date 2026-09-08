import { StyleSheet, View } from 'react-native';

import { space, type Tone } from '@/shared/theme';
import { ProgressBar, Text } from '@/shared/ui';

import type { Zone } from '../model/day-metrics';

type BarTone = Extract<Tone, 'success' | 'warning' | 'danger' | 'highlight'>;

/**
 * Разбивка по зонам: сколько времени показатель провёл в каждом диапазоне.
 *
 * Тон растёт вместе с номером зоны — цвет здесь кодирует отклонение от покоя,
 * а не саму зону, поэтому последние диапазоны всегда красные независимо от их
 * количества.
 */
const TONES: readonly BarTone[] = [
  'success',
  'success',
  'highlight',
  'warning',
  'danger',
  'danger',
];

export function ZoneBars({ zones }: { zones: readonly Zone[] }) {
  return (
    <View style={styles.wrap}>
      {zones.map((zone, index) => (
        <View key={zone.label} style={styles.row}>
          <Text variant="bodySmall" style={styles.label}>
            {zone.label}
          </Text>
          <View style={styles.bar}>
            <ProgressBar value={zone.share / 100} tone={TONES[index] ?? 'danger'} />
          </View>
          <Text variant="bodySmall" tone="muted" style={styles.share}>
            {zone.share}%
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space.xs,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
  label: {
    // Подписи зон разной длины: без общей ширины полосы начинаются вразнобой.
    width: 76,
  },
  bar: {
    flex: 1,
  },
  share: {
    width: 40,
    textAlign: 'right',
  },
});
