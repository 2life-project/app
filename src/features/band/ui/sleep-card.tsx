import { StyleSheet, View } from 'react-native';

import { type SleepSegment, sleepTotals } from '@/core/band';
import { space } from '@/shared/theme';
import { ActionLink, Card, ProgressBar, Stack, Text } from '@/shared/ui';

import { lastNight } from '../model/day-metrics';

import { Hypnogram } from './hypnogram';

/** Норма сна, к которой считается полоса. Восемь часов — общая рекомендация. */
const TARGET_MINUTES = 8 * 60;

/**
 * Последняя ночь: ход по стадиям и итоги.
 *
 * Показывается именно ночь, а не сумма за неделю — стадии имеют смысл внутри
 * одного сна, а сложенные за семь дней они не значат ничего.
 */
export function SleepCard({
  sleep,
  onOpen,
}: {
  sleep: readonly SleepSegment[];
  onOpen: () => void;
}) {
  const night = lastNight(sleep);

  if (!night) {
    return (
      <Card variant="sunken">
        <Stack gap="xs">
          <Text variant="subtitle">Sleep</Text>
          <Text variant="bodySmall" tone="muted">
            No night recorded yet.
          </Text>
        </Stack>
      </Card>
    );
  }

  const totals = sleepTotals(night.segments);
  // Время во сне без пробуждений: именно оно сравнивается с нормой, а «в
  // постели» завышает результат на каждый подъём среди ночи.
  const asleep = night.minutes - totals.awake;

  return (
    <Card variant="sunken">
      <Stack gap="md">
        <View style={styles.header}>
          <Text variant="subtitle">Sleep</Text>
          <ActionLink label="Details" chevron onPress={onOpen} />
        </View>

        <Text variant="caption" tone="muted">
          {clock(night.from)} — {clock(night.to)}
        </Text>

        <View style={styles.value}>
          <Text variant="metric">{duration(asleep)}</Text>
          <Text variant="bodySmall" tone="muted">
            asleep · {share(asleep, TARGET_MINUTES)}% of 8h
          </Text>
        </View>

        <ProgressBar
          value={Math.min(1, asleep / TARGET_MINUTES)}
          tone={asleep >= TARGET_MINUTES ? 'success' : 'warning'}
        />

        <Hypnogram segments={night.segments} totals={totals} />
      </Stack>
    </Card>
  );
}

function duration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function share(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

function clock(at: Date): string {
  return at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  value: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: space.xs,
  },
});
