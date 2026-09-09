import { useMemo } from 'react';

import { Stack } from '@/shared/ui';

import {
  STRESS_ZONES,
  readingsCaption,
  startOfToday,
  stressPoints,
  summaryOf,
  thin,
  zonesOf,
} from '../model/day-metrics';
import type { BandState } from '../model/use-band';

import type { DetailKind } from './band-details';
import { HeartCard } from './heart-card';
import { MeasurementsCard } from './measurements-card';
import { MetricCard } from './metric-card';
import { WalkCard } from './walk-card';
import { ZoneBars } from './zone-bars';

/**
 * Показатели за сегодня.
 *
 * Своя карточка — только у того, что измеряется постоянно: пульс, ходьба,
 * стресс. Всё остальное браслет снимает раз-два в сутки, и карточка с графиком
 * и разбросом вокруг одного числа выдаёт единственный замер за ряд наблюдений,
 * поэтому такие показатели идут строками.
 */
export function BandMetrics({
  state,
  onOpen,
}: {
  state: BandState;
  onOpen: (kind: DetailKind) => void;
}) {
  // `startOfToday()` в теле рендера возвращает новую дату на каждый вызов и
  // сбрасывал бы любую память ниже по дереву.
  const stress = useMemo(() => stressPoints(state.stress, startOfToday()), [state.stress]);
  const stressSummary = useMemo(() => summaryOf(stress), [stress]);
  const stressSeries = useMemo(() => thin(stress), [stress]);
  const stressZones = useMemo(() => zonesOf(stress, STRESS_ZONES), [stress]);

  return (
    <Stack gap="md">
      <HeartCard state={state} axis={timeAxis(state.today)} onOpen={() => onOpen('heart')} />

      <WalkCard state={state} onOpen={() => onOpen('walk')} />

      <MetricCard
        title="Стресс"
        value={String(state.measurement?.stress ?? stress[stress.length - 1]?.value ?? '\u2014')}
        caption={readingsCaption(stress.length)}
        tone="warning"
        series={stressSeries}
        summary={stressSummary}
        axis={timeAxis(stress)}>
        {stress.length > 0 ? <ZoneBars zones={stressZones} /> : null}
      </MetricCard>

      <MeasurementsCard state={state} onOpen={() => onOpen('measurements')} />
    </Stack>
  );
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
