import { StyleSheet, View } from 'react-native';

import { radius, space, theme, type Tone } from '@/shared/theme';

import { Text } from './text';

export type BarChartProps = {
  values: readonly number[];
  /** Столбец сегодняшнего дня — он выделен насыщенным тоном. */
  highlightIndex?: number;
  tone?: Extract<Tone, 'success' | 'warning' | 'danger'>;
  /** Подписи по краям оси: начало периода и «сегодня». */
  axis?: [string, string];
};

/**
 * Столбчатый график периода. Значения нормируются по максимуму — так столбцы
 * занимают всю высоту независимо от единиц измерения.
 */
export function BarChart({ values, highlightIndex, tone = 'success', axis }: BarChartProps) {
  const peak = Math.max(...values, 1);

  return (
    <View style={styles.wrap}>
      <View style={styles.plot}>
        {values.map((value, index) => (
          <View
            key={index}
            style={[
              styles.bar,
              {
                height: `${Math.max(6, (value / peak) * 100)}%`,
                backgroundColor:
                  index === highlightIndex ? theme.color[tone].solid : theme.color[tone].border,
              },
            ]}
          />
        ))}
      </View>
      {axis ? (
        <View style={styles.axis}>
          <Text variant="bodySmall" tone="muted">
            {axis[0]}
          </Text>
          <Text variant="bodySmall" tone="muted">
            {axis[1]}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const PLOT_HEIGHT = 96;

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  plot: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: PLOT_HEIGHT },
  bar: { flex: 1, borderRadius: radius.full },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
});
