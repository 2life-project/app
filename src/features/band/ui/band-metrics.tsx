import { StyleSheet, View } from 'react-native';

import { space } from '@/shared/theme';
import { BarChart, Card, Stack, StatTile, Text } from '@/shared/ui';

import {
  HEART_RATE_ZONES,
  STRESS_ZONES,
  byHour,
  seriesOf,
  startOfToday,
  stressPoints,
  summaryOf,
  thin,
  zonesOf,
  type Point,
} from '../model/day-metrics';
import type { BandState } from '../model/use-band';

import { MetricCard } from './metric-card';
import { ZoneBars } from './zone-bars';

/**
 * Показатели за сегодня.
 *
 * Каждый показатель строится из поминутной истории, а не из последнего отчёта:
 * браслет измеряет пульс раз в минуту и кислород по расписанию, поэтому «сейчас»
 * без хода за сутки — это одно число неизвестной давности.
 */
export function BandMetrics({ state }: { state: BandState }) {
  const today = state.today;
  const axis = timeAxis(today);

  const heart = seriesOf(today, (sample) => sample.heartRate ?? sample.averageHeartRate);
  const oxygen = seriesOf(today, (sample) => sample.bloodOxygen);
  const hrv = seriesOf(today, (sample) => sample.hrv);
  const systolic = seriesOf(today, (sample) => sample.systolic);
  const stress = stressPoints(state.stress, startOfToday());

  return (
    <Stack gap="md">
      <MetricCard
        title="Heart rate"
        value={String(state.measurement?.heartRate ?? state.live?.heartRate ?? last(heart) ?? '—')}
        unit="bpm"
        caption={caption(heart.length)}
        tone="danger"
        series={thin(heart)}
        summary={summaryOf(heart)}
        axis={axis}>
        {heart.length > 0 ? <ZoneBars zones={zonesOf(heart, HEART_RATE_ZONES)} /> : null}
      </MetricCard>

      <StepsCard state={state} />

      <MetricCard
        title="Stress"
        value={String(state.measurement?.stress ?? last(stress) ?? '—')}
        caption={caption(stress.length)}
        tone="warning"
        series={thin(stress)}
        summary={summaryOf(stress)}
        axis={timeAxis(stress.map((point) => ({ at: point.at })))}>
        {stress.length > 0 ? <ZoneBars zones={zonesOf(stress, STRESS_ZONES)} /> : null}
      </MetricCard>

      <MetricCard
        title="Blood oxygen"
        value={String(
          state.measurement?.bloodOxygen ?? state.live?.bloodOxygen ?? last(oxygen) ?? '—',
        )}
        unit="%"
        caption={caption(oxygen.length)}
        tone="highlight"
        series={thin(oxygen)}
        summary={summaryOf(oxygen)}
        axis={axis}
      />

      <MetricCard
        title="HRV"
        value={String(state.measurement?.hrv ?? last(hrv) ?? '—')}
        unit="ms"
        caption={caption(hrv.length)}
        tone="success"
        series={thin(hrv)}
        summary={summaryOf(hrv)}
        axis={axis}
      />

      <PressureCard state={state} systolic={systolic} axis={axis} />
    </Stack>
  );
}

/** Шаги по часам: столбцы читаются лучше линии, когда значения складываются. */
function StepsCard({ state }: { state: BandState }) {
  const hours = byHour(state.today, (sample) => sample.steps);
  const total = state.summary?.steps ?? hours.reduce((sum, value) => sum + value, 0);
  const peak = Math.max(...hours);

  return (
    <Card variant="sunken">
      <Stack gap="sm">
        <View style={styles.header}>
          <Text variant="subtitle">Activity</Text>
          <Text variant="bodySmall" tone="muted">
            {peak > 0 ? `peak ${peak} steps/h` : 'no steps yet'}
          </Text>
        </View>

        <View style={styles.value}>
          <Text variant="metric">{String(total)}</Text>
          <Text variant="bodySmall" tone="muted">
            steps
          </Text>
        </View>

        <BarChart values={hours} highlightIndex={new Date().getHours()} axis={['00:00', '24:00']} />

        <View style={styles.tiles}>
          <StatTile label="Distance" value={kilometres(state.summary?.distance ?? 0)} unit="km" />
          <StatTile label="Calories" value={String(state.summary?.calories ?? 0)} unit="kcal" />
          <StatTile
            label="Active hours"
            value={String(hours.filter((value) => value > 0).length)}
          />
        </View>
      </Stack>
    </Card>
  );
}

/** Давление приходит парой, поэтому отдельной карточкой: одно число тут врёт. */
function PressureCard({
  state,
  systolic,
  axis,
}: {
  state: BandState;
  systolic: readonly Point[];
  axis?: [string, string];
}) {
  const high = state.measurement?.systolic ?? state.live?.systolic ?? last(systolic);
  const low = state.measurement?.diastolic ?? state.live?.diastolic;

  return (
    <MetricCard
      title="Blood pressure"
      value={high && low ? `${high}/${low}` : '—'}
      unit="mmHg"
      caption={caption(systolic.length)}
      tone="danger"
      series={thin(systolic)}
      axis={axis}
    />
  );
}

function last(points: readonly Point[]): number | undefined {
  return points[points.length - 1]?.value;
}

function caption(count: number): string {
  return count === 0 ? 'no data' : `${count} readings today`;
}

function timeAxis(samples: readonly { at: Date }[]): [string, string] | undefined {
  const first = samples[0];
  const final = samples[samples.length - 1];
  if (!first || !final) return undefined;
  return [clock(first.at), clock(final.at)];
}

function clock(at: Date): string {
  return at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function kilometres(metres: number): string {
  return (Math.round(metres / 100) / 10).toFixed(1);
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: space.sm,
    justifyContent: 'space-between',
  },
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
