import { StyleSheet, View } from 'react-native';

import { space } from '@/shared/theme';
import { Card, ProgressBar, Stack, StatTile, SummaryRow, Text } from '@/shared/ui';

import type { BandState } from '../model/use-band';

import { Hypnogram } from './hypnogram';

const TARGET_MINUTES = 8 * 60;

/**
 * Разбор ночи: рельеф стадий, качество и каждый отрезок по порядку.
 *
 * Сводка отвечает «сколько спал», а разбор — «как»: восемь часов с пятью
 * пробуждениями и восемь часов подряд восстанавливают по-разному, и в итоговом
 * числе эта разница не видна.
 */
export function SleepDetail({ state }: { state: BandState }) {
  const night = state.sleep[state.sleep.length - 1];

  if (!night) {
    return (
      <Card variant="sunken">
        <Text tone="muted">Ни одной ночи пока не записано.</Text>
      </Card>
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
          <Text variant="subtitle">Качество</Text>
          <View style={styles.tiles}>
            <StatTile label="Эффективность" value={`${quality.efficiency}`} unit="%" />
            <StatTile label="Циклы" value={String(quality.cycles)} />
          </View>
          <View style={styles.tiles}>
            <StatTile label="Пробуждения" value={String(quality.awakenings)} />
            <StatTile label="Самый длинный отрезок" value={duration(quality.longestBlock)} />
          </View>
          <Text variant="caption" tone="muted">
            Efficiency is time asleep divided by time in bed. Cycles are counted by returns to REM —
            it closes a cycle.
          </Text>
        </Stack>
      </Card>

      <Card variant="sunken">
        <Stack gap="sm">
          <Text variant="subtitle">Стадии</Text>
          <SummaryRow
            title="Глубокий"
            subtitle={`${quality.shares.deep}%`}
            value={duration(totals.deep)}
          />
          <SummaryRow
            title="Лёгкий"
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
            title="Пробуждения"
            subtitle={`${quality.shares.awake}%`}
            value={duration(totals.awake)}
            divider
          />
        </Stack>
      </Card>

      <Card variant="sunken">
        <Stack gap="sm">
          <Text variant="subtitle">Ход ночи</Text>
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

function duration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function clock(at: Date): string {
  return at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
