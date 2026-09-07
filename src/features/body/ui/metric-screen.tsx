import { useState } from 'react';

import { Screen, ScreenHeader, Segmented, Stack, WidgetCard, LineChart } from '@/shared/ui';

import { METRIC_CHARTS, METRIC_RANGES, type MetricRange } from '../model/metric';

export const MetricScreenOptions = { headerShown: false };

/** Все графики системы за выбранный период — вход по «More» из виджета системы. */
export function MetricScreen({ id: _id }: { id: string }) {
  const [range, setRange] = useState<MetricRange>('28d');

  return (
    <Screen>
      <Stack gap="md">
        <ScreenHeader title="Heart · all charts" subtitle="every metric we track for this system" />

        <Segmented items={METRIC_RANGES} value={range} onChange={setRange} />

        {METRIC_CHARTS.map((chart) => (
          <WidgetCard key={chart.id} title={chart.title} caption={chart.caption}>
            <LineChart values={chart.values} />
          </WidgetCard>
        ))}
      </Stack>
    </Screen>
  );
}
