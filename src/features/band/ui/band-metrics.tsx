import { Card, Stack, Text } from '@/shared/ui';

import {
  STRESS_ZONES,
  seriesOf,
  startOfToday,
  stressPoints,
  summaryOf,
  thin,
  zonesOf,
  type Point,
} from '../model/day-metrics';
import type { BandState } from '../model/use-band';

import { HeartCard } from './heart-card';
import { MetricCard } from './metric-card';
import { WalkCard } from './walk-card';
import { ZoneBars } from './zone-bars';

/**
 * Показатели за сегодня.
 *
 * Каждый строится из поминутной истории, а не из последнего отчёта: браслет
 * измеряет пульс раз в минуту и кислород по расписанию, поэтому «сейчас» без
 * хода за сутки — это одно число неизвестной давности.
 *
 * Показатели без единого замера в карточки не разворачиваются: восемь пустых
 * плашек читаются как сломанный раздел, а не как «датчик сегодня молчал».
 */
export function BandMetrics({ state }: { state: BandState }) {
  const today = state.today;
  const axis = timeAxis(today);

  const oxygen = seriesOf(today, (sample) => sample.bloodOxygen);
  const hrv = seriesOf(today, (sample) => sample.hrv);
  const systolic = seriesOf(today, (sample) => sample.systolic);
  const diastolic = seriesOf(today, (sample) => sample.diastolic);
  const mood = seriesOf(today, (sample) => sample.mood);
  const sugar = seriesOf(today, (sample) => sample.bloodSugar);
  const stress = stressPoints(state.stress, startOfToday());

  const pressure = pressureValue(state, systolic, diastolic);
  const silent: string[] = [];
  if (oxygen.length === 0 && state.measurement?.bloodOxygen === undefined) silent.push('SpO₂');
  if (hrv.length === 0 && state.measurement?.hrv === undefined) silent.push('HRV');
  if (pressure === null) silent.push('blood pressure');
  if (mood.length === 0 && state.measurement?.mood === undefined) silent.push('mood');
  if (sugar.length === 0) silent.push('blood sugar');

  return (
    <Stack gap="md">
      <HeartCard state={state} axis={axis} />

      <WalkCard state={state} />

      <MetricCard
        title="Stress"
        value={String(state.measurement?.stress ?? last(stress) ?? '—')}
        caption={readings(stress.length)}
        tone="warning"
        series={thin(stress)}
        summary={summaryOf(stress)}
        axis={timeAxis(stress)}>
        {stress.length > 0 ? <ZoneBars zones={zonesOf(stress, STRESS_ZONES)} /> : null}
      </MetricCard>

      {oxygen.length > 0 || state.measurement?.bloodOxygen !== undefined ? (
        <MetricCard
          title="Blood oxygen"
          value={String(
            state.measurement?.bloodOxygen ?? state.live?.bloodOxygen ?? last(oxygen) ?? '—',
          )}
          unit="%"
          caption={readings(oxygen.length)}
          tone="highlight"
          series={thin(oxygen)}
          summary={summaryOf(oxygen)}
          axis={axis}
        />
      ) : null}

      {hrv.length > 0 || state.measurement?.hrv !== undefined ? (
        <MetricCard
          title="HRV"
          value={String(state.measurement?.hrv ?? last(hrv) ?? '—')}
          unit="ms"
          caption={readings(hrv.length)}
          tone="success"
          series={thin(hrv)}
          summary={summaryOf(hrv)}
          axis={axis}
        />
      ) : null}

      {pressure === null ? null : (
        <MetricCard
          title="Blood pressure"
          value={pressure}
          unit="mmHg"
          caption={readings(systolic.length)}
          tone="danger"
          series={thin(systolic)}
          axis={axis}
        />
      )}

      {mood.length > 0 || state.measurement?.mood !== undefined ? (
        <MetricCard
          title="Mood"
          value={String(state.measurement?.mood ?? last(mood) ?? '—')}
          caption={readings(mood.length)}
          tone="highlight"
          series={thin(mood)}
          summary={summaryOf(mood)}
          axis={axis}
        />
      ) : null}

      {sugar.length > 0 ? (
        <MetricCard
          title="Blood sugar"
          value={String(last(sugar) ?? '—')}
          unit="mmol/L"
          caption={readings(sugar.length)}
          tone="warning"
          series={thin(sugar)}
          summary={summaryOf(sugar)}
          axis={axis}
        />
      ) : null}

      {silent.length === 0 ? null : (
        <Card variant="sunken">
          <Stack gap="xs">
            <Text variant="subtitle">Nothing measured today</Text>
            <Text variant="bodySmall" tone="muted">
              {silent.join(', ')}. These sensors run on a schedule or on demand — press Measure to
              take a reading now.
            </Text>
          </Stack>
        </Card>
      )}
    </Stack>
  );
}

/** Давление осмысленно только парой: одно число здесь вводит в заблуждение. */
function pressureValue(
  state: BandState,
  systolic: readonly Point[],
  diastolic: readonly Point[],
): string | null {
  const high = state.measurement?.systolic ?? state.live?.systolic ?? last(systolic);
  const low = state.measurement?.diastolic ?? state.live?.diastolic ?? last(diastolic);
  return high && low ? `${high}/${low}` : null;
}

function last(points: readonly Point[]): number | undefined {
  return points[points.length - 1]?.value;
}

function readings(count: number): string {
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
