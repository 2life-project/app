import { StyleSheet, View } from 'react-native';

import { space } from '@/shared/theme';
import { BarChart, Card, LineChart, Stack, StatTile, SummaryRow, Text } from '@/shared/ui';

import { HEART_RATE_ZONES, seriesOf, summaryOf, thin, zonesOf } from '../model/day-metrics';
import { extremes, hourlyAverages } from '../model/detail';
import type { BandState } from '../model/use-band';

import { ZoneBars } from './zone-bars';

/** Сколько последних замеров показывать списком: дальше это уже выгрузка, а не чтение. */
const RECENT = 12;

/**
 * Разбор пульса за день: ход, разброс, зоны, часы и последние замеры.
 *
 * На обзорной карточке всё это не помещается и не нужно — там человек смотрит
 * «что сейчас». Сюда он проваливается с вопросом «а почему так».
 */
export function HeartDetail({ state }: { state: BandState }) {
  const points = seriesOf(state.today, (sample) => sample.heartRate ?? sample.averageHeartRate);
  const summary = summaryOf(points);
  const hours = hourlyAverages(points);
  const peak = extremes(hours);
  const resting = lastResting(state);

  if (!summary) {
    return (
      <Card variant="sunken">
        <Text tone="muted">No heart rate recorded today.</Text>
      </Card>
    );
  }

  return (
    <Stack gap="md">
      <Card variant="sunken">
        <Stack gap="sm">
          <Text variant="subtitle">Through the day</Text>
          <LineChart values={thin(points, 200)} tone="danger" height={140} />
          <View style={styles.tiles}>
            <StatTile label="Min" value={String(summary.min)} unit="bpm" />
            <StatTile label="Avg" value={String(summary.average)} unit="bpm" />
          </View>
          <View style={styles.tiles}>
            <StatTile label="Max" value={String(summary.max)} unit="bpm" />
            <StatTile
              label="Resting"
              value={resting === undefined ? '—' : String(resting)}
              unit="bpm"
            />
          </View>
        </Stack>
      </Card>

      <Card variant="sunken">
        <Stack gap="sm">
          <Text variant="subtitle">By hour</Text>
          <BarChart
            values={hours.map((hour) => hour.value)}
            highlightIndex={new Date().getHours()}
            tone="danger"
            axis={['00:00', '24:00']}
          />
          {peak ? (
            <>
              <SummaryRow
                title="Calmest hour"
                subtitle={`${peak.low.count} readings`}
                value={`${clock(peak.low.hour)} · ${peak.low.value} bpm`}
              />
              <SummaryRow
                title="Busiest hour"
                subtitle={`${peak.high.count} readings`}
                value={`${clock(peak.high.hour)} · ${peak.high.value} bpm`}
                divider
              />
            </>
          ) : null}
        </Stack>
      </Card>

      <Card variant="sunken">
        <Stack gap="sm">
          <Text variant="subtitle">Zones</Text>
          <ZoneBars zones={zonesOf(points, HEART_RATE_ZONES)} all />
          <Text variant="caption" tone="muted">
            Share of today’s readings that fell into each range.
          </Text>
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
                title={time(point.at)}
                value={`${point.value} bpm`}
                divider={index > 0}
              />
            ))}
        </Stack>
      </Card>
    </Stack>
  );
}

function lastResting(state: BandState): number | undefined {
  for (let index = state.today.length - 1; index >= 0; index -= 1) {
    const value = state.today[index]?.restingHeartRate;
    if (value) return value;
  }
  return undefined;
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
