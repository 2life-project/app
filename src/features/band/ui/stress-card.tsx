import { useMemo } from 'react';

import { NO_VALUE } from '@/shared/domain';

import type { BandState } from '../model/band-state';
import {
  STRESS_ZONES,
  readingsCaption,
  startOfToday,
  stressPoints,
  summaryOf,
  thin,
  timeAxis,
  zonesOf,
} from '../model/day-metrics';

import { MetricCard } from './metric-card';
import { ZoneBars } from './zone-bars';

/** Стресс за сегодня: фирменный показатель браслета, сервер его не считает. */
export function StressCard({ state, onOpen }: { state: BandState; onOpen: () => void }) {
  const stress = useMemo(() => stressPoints(state.stress, startOfToday()), [state.stress]);
  const summary = useMemo(() => summaryOf(stress), [stress]);
  const series = useMemo(() => thin(stress), [stress]);
  const zones = useMemo(() => zonesOf(stress, STRESS_ZONES), [stress]);

  return (
    <MetricCard
      title="Stress"
      value={String(state.measurement?.stress ?? stress[stress.length - 1]?.value ?? NO_VALUE)}
      caption={readingsCaption(stress.length)}
      tone="warning"
      series={series}
      summary={summary}
      axis={timeAxis(stress)}
      onOpen={onOpen}>
      {stress.length > 0 ? <ZoneBars zones={zones} /> : null}
    </MetricCard>
  );
}
