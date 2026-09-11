import { StyleSheet, View } from 'react-native';

import { space } from '@/shared/theme';
import { Card, EmptyState, ProgressBar, Stack, StatTile, SummaryRow, Text } from '@/shared/ui';

import type { SleepSession } from '../api';
import { clock, duration } from '../model/format';

import { Hypnogram } from './hypnogram';

const TARGET_MINUTES = 8 * 60;

/**
 * Разбор ночи: рельеф стадий, качество и каждый отрезок по порядку.
 *
 * Сводка отвечает «сколько спал», а разбор — «как»: восемь часов с пятью
 * пробуждениями и восемь часов подряд восстанавливают по-разному, и в итоговом
 * числе эта разница не видна.
 */
export function SleepDetail({ night }: { night: SleepSession | undefined }) {
  if (!night) {
    return (
      <EmptyState
        title="No nights yet"
        description="The band scores sleep on its own when worn through the night."
      />
    );
  }

  const totals = night.totals;
  const quality = night;

  return (
    <Stack gap="md">
      <Card variant="sunken">
        <Stack gap="sm">
          <Text variant="subtitle">
            {clock(night.from)} — {clock(night.to)}
          </Text>
          <View style={styles.value}>
            <Text variant="metric">{duration(quality.asleep)}</Text>
            <Text variant="bodySmall" tone="muted">
              asleep of {duration(quality.inBed)} in bed
            </Text>
          </View>
          <ProgressBar
            value={Math.min(1, quality.asleep / TARGET_MINUTES)}
            tone={quality.asleep >= TARGET_MINUTES ? 'success' : 'warning'}
          />
          <Hypnogram segments={night.segments} totals={totals} />
        </Stack>
      </Card>

      <Card variant="sunken">
        <Stack gap="sm">
          <Text variant="subtitle">Quality</Text>
          <View style={styles.tiles}>
            <StatTile label="EFFICIENCY" value={`${quality.efficiency}`} unit="%" />
            <StatTile label="CYCLES" value={String(quality.cycles)} />
          </View>
          <View style={styles.tiles}>
            <StatTile label="AWAKENINGS" value={String(quality.awakenings)} />
            <StatTile label="LONGEST BLOCK" value={duration(quality.longestBlock)} />
          </View>
          <Text variant="caption" tone="muted">
            Efficiency is time asleep divided by time in bed. Cycles are counted by returns to REM —
            it closes a cycle.
          </Text>
        </Stack>
      </Card>

      <Card variant="sunken">
        <Stack gap="sm">
          <Text variant="subtitle">Stages</Text>
          <SummaryRow
            title="Deep"
            subtitle={`${quality.shares.deep}%`}
            value={duration(totals.deep)}
          />
          <SummaryRow
            title="Light"
            subtitle={`${quality.shares.light}%`}
            value={duration(totals.light)}
            divider
          />
          <SummaryRow
            title="REM"
            subtitle={`${quality.shares.rem}%`}
            value={duration(totals.rem)}
            divider
          />
          <SummaryRow
            title="Awake"
            subtitle={`${quality.shares.awake}%`}
            value={duration(totals.awake)}
            divider
          />
        </Stack>
      </Card>

      <Card variant="sunken">
        <Stack gap="sm">
          <Text variant="subtitle">Through the night</Text>
          {night.segments.map((segment, index) => (
            <SummaryRow
              key={`${segment.at.getTime()}-${index}`}
              title={label(segment.stage)}
              subtitle={clock(segment.at)}
              value={duration(segment.minutes)}
              divider={index > 0}
            />
          ))}
        </Stack>
      </Card>
    </Stack>
  );
}

function label(stage: string): string {
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}

const styles = StyleSheet.create({
  value: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: space.xs,
  },
  tiles: {
    flexDirection: 'row',
    gap: space.sm,
  },
});
