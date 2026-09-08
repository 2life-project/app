import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

import { theme, type Tone } from '@/shared/theme';

export type LineChartProps = {
  values: readonly number[];
  tone?: Extract<Tone, 'success' | 'warning' | 'danger' | 'highlight'>;
  height?: number;
};

/**
 * Линия периода. Ширина берётся из раскладки, а не задаётся числом: карточка
 * тянется по экрану, и фиксированная ширина оставила бы линию короче неё.
 */
export function LineChart({ values, tone = 'success', height = 96 }: LineChartProps) {
  const [width, setWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const points = values
    .map((value, index) => {
      const y = height - ((value - min) / span) * (height - STROKE) - STROKE / 2;
      return `${index * step},${y}`;
    })
    .join(' ');

  return (
    <View style={[styles.wrap, { height }]} onLayout={onLayout}>
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Polyline
            points={points}
            fill="none"
            stroke={theme.color[tone].solid}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      ) : null}
    </View>
  );
}

const STROKE = 3;

const styles = StyleSheet.create({
  wrap: { width: '100%' },
});
