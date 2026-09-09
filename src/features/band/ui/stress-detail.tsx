import { StyleSheet, View } from 'react-native';

import { space } from '@/shared/theme';
import { BarChart, Card, LineChart, Stack, StatTile, SummaryRow, Text } from '@/shared/ui';

import {
  STRESS_ZONES,
  startOfToday,
  stressPoints,
  summaryOf,
  thin,
  zonesOf,
} from '../model/day-metrics';
import { extremes, hourlyAverages } from '../model/detail';
import type { BandState } from '../model/use-band';

import { ZoneBars } from './zone-bars';

const RECENT = 12;

/**
 * Разбор стресса: ход за день, зоны, часы и последние замеры.
 *
 * Индекс — производная от вариабельности пульса, а не отдельный датчик, и
 * смысл он имеет только в динамике: одно число без ряда не говорит ничего.
 */
export function StressDetail({ state }: { state: BandState }) {
  const points = stressPoints(state.stress, startOfToday());
  const summary = summaryOf(points);
  const hours = hourlyAverages(points);
  const peak = extremes(hours);

  if (!summary) {
    return (
      <Card variant="sunken">
        <Text tone="muted">Замеров стресса сегодня нет.</Text>
      </Card>
    );
  }

  return (
    <Stack gap="md">
      <Card variant="sunken">
        <Stack gap="sm">
          <Text variant="subtitle">За день</Text>
          <LineChart values={thin(points, 200)} tone="warning" height={140} />
          <View style={styles.tiles}>
            <StatTile label="Минимум" value={String(summary.min)} />
            <StatTile label="Среднее" value={String(summary.average)} />
            <StatTile label="Максимум" value={String(summary.max)} />
          </View>
        </Stack>
      </Card>

      <Card variant="sunken">
        <Stack gap="sm">
          <Text variant="subtitle">По часам</Text>
          <BarChart
            values={hours.map((hour) => hour.value)}
            highlightIndex={new Date().getHours()}
            tone="warning"
            axis={['00:00', '24:00']}
          />
          {peak ? (
            <>
              <SummaryRow
                title="Самый спокойный час"
                subtitle={`${peak.low.count} readings`}
                value={`${clock(peak.low.hour)} · ${peak.low.value}`}
              />
              <SummaryRow
                title="Самый напряжённый час"
                subtitle={`${peak.high.count} readings`}
                value={`${clock(peak.high.hour)} · ${peak.high.value}`}
                divider
              />
            </>
          ) : null}
        </Stack>
      </Card>

      <Card variant="sunken">
        <Stack gap="sm">
          <Text variant="subtitle">Zones</Text>
          <ZoneBars zones={zonesOf(points, STRESS_ZONES)} all />
        </Stack>
      </Card>

      <Card variant="sunken">
        <Stack gap="sm">
          <Text variant="subtitle">Последние замеры</Text>
          {[...points]
            .slice(-RECENT)
            .reverse()
            .map((point, index) => (
              <SummaryRow
                key={point.at.getTime()}
                title={time(point.at)}
                value={String(point.value)}
                divider={index > 0}
              />
            ))}
        </Stack>
      </Card>
    </Stack>
  );
}

function clock(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

function time(at: Date): string {
  return at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  tiles: {
    flexDirection: 'row',
    gap: space.sm,
  },
});
