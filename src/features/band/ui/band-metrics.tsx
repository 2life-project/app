import { Stack } from '@/shared/ui';

import {
  STRESS_ZONES,
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
  const stress = stressPoints(state.stress, startOfToday());
  const stressSummary = summaryOf(stress);

  return (
    <Stack gap="md">
      <HeartCard state={state} axis={timeAxis(state.today)} onOpen={() => onOpen('heart')} />

      <WalkCard state={state} onOpen={() => onOpen('walk')} />

      <MetricCard
        title="Stress"
        value={String(state.measurement?.stress ?? stress[stress.length - 1]?.value ?? '\u2014')}
        caption={readings(stress.length)}
        tone="warning"
        series={thin(stress)}
        summary={stressSummary}
        axis={timeAxis(stress)}>
        {stress.length > 0 ? <ZoneBars zones={zonesOf(stress, STRESS_ZONES)} /> : null}
      </MetricCard>

      <MeasurementsCard state={state} onOpen={() => onOpen('measurements')} />
    </Stack>
  );
}

function readings(count: number): string {
  if (count === 0) return 'no data';
  return count === 1 ? '1 reading today' : `${count} readings today`;
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
