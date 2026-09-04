import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { theme, type Tone } from '@/shared/theme';

import { Text } from './text';

/** Зазор между кольцом и подписью — из макета. */
const RING_LABEL_GAP = 6;

export type ProgressRingProps = {
  /** Доля заполнения от 0 до 1. */
  value: number;
  /** Что написано в центре кольца. */
  valueLabel: string;
  /** Подпись под кольцом. В виджете системы её нет — там кольцо стоит в ряду. */
  label?: string;
  /** Опора под числом внутри кольца: «из 21». */
  note?: string;
  /** Кегль числа: в крупном кольце оно больше. */
  valueVariant?: 'ringValue' | 'headline';
  /** Статус: кольцо кодирует отклонение от нормы, а не категорию. */
  tone?: Extract<Tone, 'success' | 'warning' | 'danger'>;
  size?: number;
  thickness?: number;
};

/**
 * Кольцо прогресса. Дуга рисуется штриховкой по окружности: так она остаётся
 * гладкой на любом размере и не требует пути под каждый процент.
 */
export function ProgressRing({
  value,
  valueLabel,
  label,
  note,
  valueVariant = 'ringValue',
  tone = 'success',
  size = 66,
  thickness = 7,
}: ProgressRingProps) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = Math.max(0, Math.min(1, value)) * circumference;

  return (
    <View style={styles.column}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.color.neutral.surface}
            strokeWidth={thickness}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.color[tone].solid}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
            // Дуга начинается сверху, а не справа: считать от трёх часов
            // пользователь не станет.
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            fill="none"
          />
        </Svg>
        <View style={styles.center}>
          <Text variant={valueVariant}>{valueLabel}</Text>
          {note ? (
            <Text variant="footnote" tone="muted">
              {note}
            </Text>
          ) : null}
        </View>
      </View>
      {label ? (
        <Text variant="caption" tone="muted">
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  column: { alignItems: 'center', gap: RING_LABEL_GAP },
  center: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' },
});
