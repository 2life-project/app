import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { space, type Tone } from '@/shared/theme';
import { ActionLink, Card, LineChart, Stack, StatTile, Text } from '@/shared/ui';

import type { Summary } from '../model/day-metrics';

type ChartTone = Extract<Tone, 'success' | 'warning' | 'danger' | 'highlight'>;

/** Прочерк вместо значения: замера не было. */
export const EMPTY = '—';

export type MetricCardProps = {
  title: string;
  /** Текущее значение крупно. Прочерк, когда замера ещё не было. */
  value: string;
  unit?: string;
  caption?: string;
  tone?: ChartTone;
  /** Прорежённый ряд за сегодня. Меньше двух точек — линию рисовать не из чего. */
  series?: readonly number[];
  /** Минимум, среднее и максимум за день — они же подписи под графиком. */
  summary?: Summary | null;
  /** Подписи по краям оси времени. */
  axis?: [string, string];
  /** Провал внутрь показателя: глубокая статистика живёт там, а не здесь. */
  onOpen?: () => void;
  children?: ReactNode;
};

/**
 * Одна метрика за день: число сейчас, ход за сутки и разброс.
 *
 * Шаблон один на все показатели намеренно — пульс, кислород и стресс
 * отличаются только единицами, а собранные по-разному карточки читаются как
 * разные приложения.
 */
export function MetricCard({
  title,
  value,
  unit,
  caption,
  tone = 'success',
  series,
  summary,
  axis,
  onOpen,
  children,
}: MetricCardProps) {
  // Разброс за день показываем только когда замеров было больше одного:
  // «мин 51, среднее 51, максимум 51» — это три плитки об одном числе.
  const hasLine = (series?.length ?? 0) >= 2;

  return (
    <Card variant="sunken">
      <Stack gap="sm">
        <View style={styles.header}>
          <Text variant="subtitle">{title}</Text>
          {onOpen ? (
            <ActionLink label="Details" chevron onPress={onOpen} disabled={value === EMPTY} />
          ) : caption ? (
            <Text variant="bodySmall" tone="muted">
              {caption}
            </Text>
          ) : null}
        </View>

        {onOpen && caption ? (
          <Text variant="caption" tone="muted">
            {caption}
          </Text>
        ) : null}

        <View style={styles.value}>
          <Text variant="metric">{value}</Text>
          {unit ? (
            <Text variant="bodySmall" tone="muted">
              {unit}
            </Text>
          ) : null}
        </View>

        {hasLine && series ? <LineChart values={[...series]} tone={tone} /> : null}

        {hasLine && axis ? (
          <View style={styles.axis}>
            <Text variant="caption" tone="muted">
              {axis[0]}
            </Text>
            <Text variant="caption" tone="muted">
              {axis[1]}
            </Text>
          </View>
        ) : null}

        {summary && summary.count > 1 ? (
          <View style={styles.tiles}>
            <StatTile label="MIN" value={String(summary.min)} />
            <StatTile label="AVG" value={String(summary.average)} />
            <StatTile label="MAX" value={String(summary.max)} />
          </View>
        ) : null}

        {children}

        {value === EMPTY ? (
          <Text variant="bodySmall" tone="muted">
            Сегодня не измерялось. Нажмите «Замерить», чтобы снять показание.
          </Text>
        ) : null}
      </Stack>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
    justifyContent: 'space-between',
  },
  value: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: space.xs,
  },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tiles: {
    flexDirection: 'row',
    gap: space.sm,
  },
});
