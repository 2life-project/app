import { StyleSheet, View } from 'react-native';

import { space } from '@/shared/theme';
import {
  BarChart,
  Card,
  EmptyState,
  LineChart,
  Stack,
  StatTile,
  SummaryRow,
  Text,
} from '@/shared/ui';

import type { BandState } from '../model/band-state';
import {
  STRESS_ZONES,
  startOfToday,
  stressPoints,
  summaryOf,
  thin,
  zonesOf,
} from '../model/day-metrics';
import { extremes, hourlyAverages } from '../model/detail';
import { clock, hourLabel } from '../model/format';

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
      <EmptyState
        title="No stress readings today"
        description="The band works stress out on its own, roughly every ten minutes."
      />
    );
  }

  return (
    <Stack gap="md">
      <Card variant="sunken">
        <Stack gap="sm">
          <Text variant="subtitle">Across the day</Text>
          <LineChart values={thin(points, 200)} tone="warning" height={140} />
          <View style={styles.tiles}>
            <StatTile label="MIN" value={String(summary.min)} />
            <StatTile label="AVG" value={String(summary.average)} />
            <StatTile label="MAX" value={String(summary.max)} />
          </View>
        </Stack>
      </Card>

      <Card variant="sunken">
        <Stack gap="sm">
          <Text variant="subtitle">By hour</Text>
          <BarChart
            markEmpty
            values={hours.map((hour) => hour.value)}
            highlightIndex={new Date().getHours()}
            tone="warning"
            axis={['00:00', '24:00']}
          />
          {peak ? (
            <>
              <SummaryRow
                title="Calmest hour"
                subtitle={`${peak.low.count} readings`}
                value={`${hourLabel(peak.low.hour)} · ${peak.low.value}`}
              />
              <SummaryRow
                title="Most strained hour"
                subtitle={`${peak.high.count} readings`}
                value={`${hourLabel(peak.high.hour)} · ${peak.high.value}`}
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
          <Text variant="subtitle">Latest readings</Text>
          {[...points]
            .slice(-RECENT)
            .reverse()
            .map((point, index) => (
              <SummaryRow
                key={point.at.getTime()}
                title={clock(point.at)}
                value={String(point.value)}
                divider={index > 0}
              />
            ))}
        </Stack>
      </Card>
    </Stack>
  );
}

const styles = StyleSheet.create({
  tiles: {
    flexDirection: 'row',
    gap: space.sm,
  },
});
