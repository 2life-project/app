import { StyleSheet, View } from 'react-native';

import { type SleepSegment, type SleepStageName, sleepTotals } from '@/core/band';
import { space } from '@/shared/theme';
import { Card, ProgressRing, Stack, StatTile, Text } from '@/shared/ui';

import { lastNight } from '../model/day-metrics';

import { Hypnogram, StageLegend } from './hypnogram';

/** Норма сна, к которой считается кольцо. Восемь часов — общая рекомендация. */
const TARGET_MINUTES = 8 * 60;

const STAGES: readonly { label: string; stage: SleepStageName }[] = [
  { label: 'Deep', stage: 'deep' },
  { label: 'Light', stage: 'light' },
  { label: 'REM', stage: 'rem' },
  { label: 'Awake', stage: 'awake' },
];

/**
 * Последняя ночь: ход по стадиям и итоги.
 *
 * Показывается именно ночь, а не сумма за неделю — стадии имеют смысл внутри
 * одного сна, а сложенные за семь дней они не значат ничего.
 */
export function SleepCard({ sleep }: { sleep: readonly SleepSegment[] }) {
  const night = lastNight(sleep);

  if (!night) {
    return (
      <Card variant="sunken">
        <Stack gap="xs">
          <Text variant="subtitle">Sleep</Text>
          <Text variant="bodySmall" tone="muted">
            No sleep recorded yet.
          </Text>
        </Stack>
      </Card>
    );
  }

  const totals = sleepTotals(night.segments);

  return (
    <Card variant="sunken">
      <Stack gap="sm">
        <View style={styles.header}>
          <Text variant="subtitle">Sleep</Text>
          <Text variant="bodySmall" tone="muted">
            {clock(night.from)} — {clock(night.to)}
          </Text>
        </View>

        <View style={styles.body}>
          <ProgressRing
            value={Math.min(1, night.minutes / TARGET_MINUTES)}
            valueLabel={duration(night.minutes)}
            note="of 8h"
            tone={night.minutes >= TARGET_MINUTES ? 'success' : 'warning'}
          />
          <View style={styles.tiles}>
            {STAGES.map((item) => (
              <StatTile
                key={item.stage}
                label={item.label}
                value={duration(totals[item.stage])}
                note={`${share(totals[item.stage], night.minutes)}%`}
              />
            ))}
          </View>
        </View>

        <Hypnogram segments={night.segments} />
        <StageLegend stages={STAGES} />
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
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  body: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.lg,
  },
  tiles: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
});
