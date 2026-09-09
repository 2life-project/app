import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '@/shared/theme';
import { Button, StatTile, Text } from '@/shared/ui';

import type { BandState } from '../model/band-state';
import {
  HEART_RATE_ZONES,
  lastResting,
  readingsCaption,
  seriesOf,
  summaryOf,
  thin,
  zonesOf,
} from '../model/day-metrics';
import { useHeartbeat } from '../model/use-heartbeat';

import { MetricCard } from './metric-card';
import { ZoneBars } from './zone-bars';

/**
 * Пульс: ход за день, зоны и ритм, который можно почувствовать.
 *
 * Отдельной карточкой из-за вибрации — она держит своё состояние и таймер, а
 * остальные показатели обходятся чистой отрисовкой.
 */
export function HeartCard({
  state,
  axis,
  onOpen,
}: {
  state: BandState;
  axis?: [string, string];
  onOpen: () => void;
}) {
  // Живой отчёт приходит каждые десять секунд, а под ним лежит до 1440 минут
  // дня: без памяти весь ряд, сводка, прореживание и зоны пересчитываются на
  // каждый такт, вместе со всеми соседними карточками.
  const points = useMemo(
    () => seriesOf(state.today, (sample) => sample.heartRate ?? sample.averageHeartRate),
    [state.today],
  );
  const summary = useMemo(() => summaryOf(points), [points]);
  const series = useMemo(() => thin(points), [points]);
  const zones = useMemo(() => zonesOf(points, HEART_RATE_ZONES), [points]);

  const current = state.measurement?.heartRate ?? state.live?.heartRate ?? summary?.last;
  const heartbeat = useHeartbeat(current);

  const resting = state.live?.restingHeartRate ?? lastResting(state.today);

  return (
    <MetricCard
      title="Heart rate"
      value={current === undefined ? '—' : String(current)}
      unit="bpm"
      caption={readingsCaption(points.length)}
      tone="danger"
      series={series}
      summary={summary}
      axis={axis}
      onOpen={onOpen}>
      {resting === undefined && !summary ? null : (
        <View style={styles.tiles}>
          {resting === undefined ? null : (
            <StatTile label="RESTING" value={String(resting)} unit="bpm" />
          )}
          {summary && summary.count > 1 ? (
            <StatTile label="RANGE" value={`${summary.min}–${summary.max}`} unit="bpm" />
          ) : null}
        </View>
      )}

      {points.length > 0 ? <ZoneBars zones={zones} /> : null}

      {heartbeat.available ? (
        <View style={styles.beat}>
          <Button
            label={heartbeat.on ? 'Stop the beat' : 'Feel the beat'}
            variant={heartbeat.on ? 'filled' : 'tonal'}
            size="sm"
            onPress={heartbeat.toggle}
          />
          <Text variant="caption" tone="muted">
            The phone taps out the measured rate — the tempo matches, the phase does not.
          </Text>
        </View>
      ) : null}
    </MetricCard>
  );
}

const styles = StyleSheet.create({
  tiles: {
    flexDirection: 'row',
    gap: space.sm,
  },
  beat: {
    alignItems: 'flex-start',
    gap: space.sm,
  },
});
