import { StyleSheet, View } from 'react-native';

import { space } from '@/shared/theme';
import { Button, StatTile, Text } from '@/shared/ui';

import { HEART_RATE_ZONES, seriesOf, summaryOf, thin, zonesOf } from '../model/day-metrics';
import type { BandState } from '../model/use-band';
import { useHeartbeat } from '../model/use-heartbeat';

import { MetricCard } from './metric-card';
import { ZoneBars } from './zone-bars';

/**
 * Пульс: ход за день, зоны и ритм, который можно почувствовать.
 *
 * Отдельной карточкой из-за вибрации — она держит своё состояние и таймер, а
 * остальные показатели обходятся чистой отрисовкой.
 */
export function HeartCard({ state, axis }: { state: BandState; axis?: [string, string] }) {
  const points = seriesOf(state.today, (sample) => sample.heartRate ?? sample.averageHeartRate);
  const summary = summaryOf(points);

  const current = state.measurement?.heartRate ?? state.live?.heartRate ?? summary?.last;
  const heartbeat = useHeartbeat(current);

  const resting = state.live?.restingHeartRate ?? lastResting(state);

  return (
    <MetricCard
      title="Heart rate"
      value={current === undefined ? '—' : String(current)}
      unit="bpm"
      caption={points.length === 0 ? 'no data' : `${points.length} readings today`}
      tone="danger"
      series={thin(points)}
      summary={summary}
      axis={axis}>
      {resting === undefined ? null : (
        <View style={styles.tiles}>
          <StatTile label="Resting" value={String(resting)} unit="bpm" />
          {summary ? (
            <StatTile label="Range" value={`${summary.min}–${summary.max}`} unit="bpm" />
          ) : null}
        </View>
      )}

      {points.length > 0 ? <ZoneBars zones={zonesOf(points, HEART_RATE_ZONES)} /> : null}

      <View style={styles.row}>
        <Button
          label={heartbeat.on ? 'Stop the beat' : 'Feel the beat'}
          variant="tonal"
          size="sm"
          onPress={heartbeat.toggle}
        />
        <Text variant="caption" tone="muted" style={styles.note}>
          The phone taps out the measured rate. The band reports frequency, not the beats
          themselves, so the tempo matches — the phase does not.
        </Text>
      </View>
    </MetricCard>
  );
}

/** Последний известный пульс покоя: он приходит не в каждом слоте. */
function lastResting(state: BandState): number | undefined {
  for (let index = state.today.length - 1; index >= 0; index -= 1) {
    const value = state.today[index]?.restingHeartRate;
    if (value) return value;
  }
  return undefined;
}

const styles = StyleSheet.create({
  tiles: {
    flexDirection: 'row',
    gap: space.sm,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
  note: {
    flex: 1,
  },
});
