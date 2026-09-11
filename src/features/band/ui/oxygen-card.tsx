import { useMemo } from 'react';

import { NO_VALUE } from '@/shared/domain';
import { Button, Stack, Text } from '@/shared/ui';

import type { BandState } from '../model/band-state';
import { readingsCaption, seriesOf, summaryOf, thin, timeAxis } from '../model/day-metrics';

import { MetricCard } from './metric-card';

/**
 * Кислород крови в разделе «Дыхание»: последнее значение, ряд за день и
 * кнопка разового замера — оптический датчик включается только по просьбе.
 */
export function OxygenCard({
  state,
  live,
  onMeasure,
  onOpen,
}: {
  state: BandState;
  live: boolean;
  onMeasure: () => void;
  onOpen: () => void;
}) {
  const points = useMemo(
    () => seriesOf(state.today, (sample) => sample.bloodOxygen),
    [state.today],
  );
  const summary = useMemo(() => summaryOf(points), [points]);
  const series = useMemo(() => thin(points), [points]);
  const current = state.measurement?.bloodOxygen ?? state.live?.bloodOxygen ?? summary?.last;

  return (
    <MetricCard
      title="Blood oxygen"
      value={current === undefined ? NO_VALUE : String(current)}
      unit="%"
      caption={readingsCaption(points.length)}
      series={series}
      summary={summary}
      axis={timeAxis(points)}
      onOpen={onOpen}>
      <Stack gap="xs" align="flex-start">
        <Button
          label={state.busy ? 'Measuring…' : 'Take a reading'}
          variant="tonal"
          size="sm"
          onPress={onMeasure}
          disabled={!live || state.busy}
        />
        <Text variant="caption" tone="muted">
          {live
            ? 'A single reading takes about a minute — the sensor runs for it, not all the time.'
            : 'Readings need a live connection to the band.'}
        </Text>
      </Stack>
    </MetricCard>
  );
}
