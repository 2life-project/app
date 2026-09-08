import { StyleSheet, View } from 'react-native';

import type { SleepSegment, SleepStageName } from '@/core/band';
import { radius, space, theme } from '@/shared/theme';
import { Text } from '@/shared/ui';

/**
 * Ход ночи по стадиям.
 *
 * Полосой, а не столбцами: важна последовательность и доля каждой стадии, а
 * не абсолютная длина отрезков — минутные пробуждения иначе исчезают вовсе.
 */
const STAGE_COLOR: Record<SleepStageName, string> = {
  deep: theme.color.highlight.solid,
  light: theme.color.accent.solid,
  rem: theme.color.success.solid,
  awake: theme.color.warning.solid,
  nap: theme.color.accent.border,
  snore: theme.color.neutral.border,
  sessionStart: theme.color.neutral.border,
  sessionEnd: theme.color.neutral.border,
};

const MIN_SHARE = 0.5;

export function Hypnogram({ segments }: { segments: readonly SleepSegment[] }) {
  const total = segments.reduce((sum, segment) => sum + segment.minutes, 0);
  if (total === 0) return null;

  return (
    <View style={styles.strip}>
      {segments.map((segment, index) => (
        <View
          key={`${segment.at.getTime()}-${index}`}
          style={{
            // Доля отрезка в ночи. Минимум удерживает короткие пробуждения
            // видимыми: без него минута из семи часов уходит в ноль пикселей.
            flexGrow: Math.max(MIN_SHARE, (segment.minutes / total) * 100),
            flexBasis: 0,
            backgroundColor: STAGE_COLOR[segment.stage],
          }}
        />
      ))}
    </View>
  );
}

/** Легенда под полосой: без неё цвета ничего не значат. */
export function StageLegend({
  stages,
}: {
  stages: readonly { label: string; stage: SleepStageName }[];
}) {
  return (
    <View style={styles.legend}>
      {stages.map((item) => (
        <View key={item.stage} style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: STAGE_COLOR[item.stage] }]} />
          <Text variant="caption" tone="muted">
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    borderRadius: radius.sm,
    flexDirection: 'row',
    gap: 1,
    height: 44,
    overflow: 'hidden',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.xs,
  },
  dot: {
    borderRadius: radius.full,
    height: 8,
    width: 8,
  },
});
