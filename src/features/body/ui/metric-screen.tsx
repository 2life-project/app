import { useState } from 'react';

import { useQuery } from '@/core/http/use-query';
import {
  availability,
  baselineText,
  coverageText,
  deltaText,
  formatMetric,
  metricBasis,
  metricFill,
  metricValueText,
  type MetricValue,
} from '@/shared/domain';
import { shortDay, useToday } from '@/shared/lib/day';
import {
  Card,
  InfoCard,
  LineChart,
  ListRow,
  Screen,
  ScreenHeader,
  Segmented,
  Stack,
  StatTile,
  Text,
  WidgetCard,
} from '@/shared/ui';

import { fetchMetric, metricKey } from '../api/body';
import { METRIC_RANGES, rangeStart, type MetricRange } from '../model/metric';

export const MetricScreenOptions = { headerShown: false };

/** Показатель за период: значение, на чём оно стоит, история и источники. */
export function MetricScreen({ id }: { id: string }) {
  const { date, timeZone } = useToday();
  const [range, setRange] = useState<MetricRange>('28d');
  const start = rangeStart(date, range);

  const query = useQuery(metricKey(id, start, date, timeZone), (signal) =>
    fetchMetric(id, start, date, timeZone, signal),
  );
  const metric = query.data;

  return (
    <Screen>
      <Stack gap="md">
        <ScreenHeader
          title={metric?.name ?? id}
          subtitle={metric ? metricBasis(metric) : 'loading…'}
        />

        <Segmented items={METRIC_RANGES} value={range} onChange={setRange} />

        {!metric ? (
          <Card variant="sunken">
            <Text tone="muted">
              {query.loading ? 'Loading the metric…' : 'The metric did not load.'}
            </Text>
          </Card>
        ) : (
          <>
            <Card>
              <Stack gap="sm">
                <Stack direction="row" justify="space-between" align="baseline">
                  <Text variant="display">{metricValueText(metric)}</Text>
                  <Text variant="bodySmall" tone="muted">
                    {metric.unit}
                  </Text>
                </Stack>
                <Text tone="muted">{metricBasis(metric)}</Text>
              </Stack>
            </Card>

            <Card>
              <Stack direction="row" gap="sm">
                <StatTile
                  label="COVERAGE"
                  value={coverageText(metric)}
                  note={`${metric.coverage.daysWithData} of ${metric.coverage.expectedDays} days`}
                />
                <StatTile
                  label="VS BASE"
                  value={deltaText(metric) ?? '—'}
                  note={baselineText(metric) ?? 'not enough samples'}
                />
              </Stack>
            </Card>

            {/* График рисуется только когда есть что рисовать: линия по одной
                точке показывает уверенность, которой нет. */}
            {values(metric).length > 1 ? (
              <WidgetCard title={`${metric.name} · ${metric.period.days} days`}>
                <LineChart values={values(metric)} />
              </WidgetCard>
            ) : null}

            {(metric.series ?? []).length > 0 ? (
              <WidgetCard title="Where it comes from">
                <Stack gap="sm">
                  {(metric.series ?? []).map((source) => (
                    <ListRow
                      key={source.id}
                      title={source.source}
                      subtitle={`${source.origin ?? 'unknown origin'} · ${source.points.length} points`}
                      trailing={source.unit}
                    />
                  ))}
                </Stack>
              </WidgetCard>
            ) : null}

            <InfoCard title="What this number rests on" text={note(metric)} />
          </>
        )}
      </Stack>
    </Screen>
  );
}

function values(metric: MetricValue) {
  return metric.points
    .map((point) => point.value)
    .filter((value): value is number => value !== null);
}

/**
 * Объяснение под числом. Свежесть и покрытие сервер отдаёт отдельно от
 * значения, и человеку они нужны рядом с ним: старое число — всё ещё число,
 * но читать его надо иначе.
 */
function note(metric: MetricValue) {
  if (availability(metric) === 'unavailable') {
    return 'The source is not being read right now, so there is nothing to show for this period.';
  }
  if (metric.value === null) {
    return metric.manual?.allowed
      ? 'Nothing recorded for this period yet — you can add a measurement by hand.'
      : 'Nothing recorded for this period yet.';
  }
  const fill = metricFill(metric);
  const target =
    metric.target === null ? '' : ` Target ${formatMetric({ ...metric, value: metric.target })}.`;
  const share = fill === null ? '' : ` That is ${Math.round(fill * 100)}% of it.`;
  return `${metric.latestDate ? `Measured ${shortDay(metric.latestDate)}. ` : ''}Covers ${metric.coverage.daysWithData} of ${metric.coverage.expectedDays} days.${target}${share}`;
}
