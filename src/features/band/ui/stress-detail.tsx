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
        title="Замеров стресса сегодня нет"
        description="Устройство меряет стресс само примерно раз в десять минут."
      />
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
            markEmpty
            values={hours.map((hour) => hour.value)}
            highlightIndex={new Date().getHours()}
            tone="warning"
            axis={['00:00', '24:00']}
          />
          {peak ? (
            <>
              <SummaryRow
                title="Самый спокойный час"
                subtitle={`замеров: ${peak.low.count}`}
                value={`${hourLabel(peak.low.hour)} · ${peak.low.value}`}
              />
              <SummaryRow
                title="Самый напряжённый час"
                subtitle={`замеров: ${peak.high.count}`}
                value={`${hourLabel(peak.high.hour)} · ${peak.high.value}`}
                divider
              />
            </>
          ) : null}
        </Stack>
      </Card>

      <Card variant="sunken">
        <Stack gap="sm">
          <Text variant="subtitle">Зоны</Text>
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
