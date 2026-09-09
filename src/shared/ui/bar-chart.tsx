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
  /**
   * Рисовать ноль засечкой, а не коротким столбцом.
   *
   * По умолчанию выключено: общий минимум высоты был у всех графиков с самого
   * начала, и менять их вид заодно с правкой одной карточки нельзя. Там, где
   * пустой час важно отличать от часа с парой шагов, признак включается явно.
   */
  markEmpty?: boolean;
};

/** Доля высоты у пустого столбца: он остаётся засечкой на оси, а не столбцом. */
const EMPTY_HEIGHT = 2;

/** Минимум для непустого столбца: иначе единица на фоне тысячи исчезает вовсе. */
const MIN_HEIGHT = 8;

/**
 * Столбчатый график периода. Значения нормируются по максимуму — так столбцы
 * занимают всю высоту независимо от единиц измерения.
 *
 * Ноль рисуется засечкой, а не коротким столбцом: общий минимум высоты делал
 * пустой час неотличимым от часа с парой шагов, и день из трёх прогулок
 * выглядел как день сплошной активности.
 */
export function BarChart({
  values,
  highlightIndex,
  tone = 'success',
  axis,
  markEmpty = false,
}: BarChartProps) {
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
                height: `${
                  markEmpty && value === 0
                    ? EMPTY_HEIGHT
                    : Math.max(MIN_HEIGHT, (value / peak) * 100)
                }%`,
                backgroundColor:
                  markEmpty && value === 0
                    ? theme.color.border
                    : index === highlightIndex
                      ? theme.color[tone].solid
                      : theme.color[tone].border,
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
