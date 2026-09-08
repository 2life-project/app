import { StyleSheet, View } from 'react-native';

import type { ActivitySample } from '@/core/band';
import { space } from '@/shared/theme';
import { Card, LineChart, Stack, StatTile, SummaryRow, Text } from '@/shared/ui';

import { seriesOf, summaryOf, thin, type Point } from '../model/day-metrics';
import type { BandState } from '../model/use-band';

/**
 * История разовых замеров.
 *
 * У этих показателей нет непрерывного ряда: датчик включается по расписанию или
 * по кнопке, и за сутки набирается один-два замера. Смысл разбора здесь не в
 * графике, а в том, когда именно замер был сделан — показатель без времени
 * снятия проверить нечем.
 */
const METRICS: readonly {
  title: string;
  unit: string;
  pick: (sample: ActivitySample) => number | undefined;
  tone: 'success' | 'warning' | 'danger' | 'highlight';
}[] = [
  { title: 'Blood oxygen', unit: '%', pick: (s) => s.bloodOxygen, tone: 'highlight' },
  { title: 'HRV', unit: 'ms', pick: (s) => s.hrv, tone: 'success' },
  { title: 'Systolic', unit: 'mmHg', pick: (s) => s.systolic, tone: 'danger' },
  { title: 'Diastolic', unit: 'mmHg', pick: (s) => s.diastolic, tone: 'danger' },
  { title: 'Mood', unit: '', pick: (s) => s.mood, tone: 'highlight' },
  { title: 'Blood sugar', unit: 'mmol/L', pick: (s) => s.bloodSugar, tone: 'warning' },
];

export function MeasurementsDetail({ state }: { state: BandState }) {
  const series = METRICS.map((metric) => ({
    ...metric,
    points: seriesOf(state.today, metric.pick),
  }));

  const measured = series.filter((item) => item.points.length > 0);
  const silent = series.filter((item) => item.points.length === 0);

  return (
    <Stack gap="md">
      {measured.map((item) => (
        <Card key={item.title} variant="sunken">
          <Stack gap="sm">
            <View style={styles.header}>
              <Text variant="subtitle">{item.title}</Text>
              <Text variant="bodySmall" tone="muted">
                {item.points.length === 1 ? '1 reading' : `${item.points.length} readings`}
              </Text>
            </View>

            {item.points.length > 1 ? (
              <LineChart values={thin(item.points, 120)} tone={item.tone} height={100} />
            ) : null}

            <Range points={item.points} unit={item.unit} />

            {item.points
              .slice(-8)
              .reverse()
              .map((point, index) => (
                <SummaryRow
                  key={point.at.getTime()}
                  title={time(point.at)}
                  value={withUnit(point.value, item.unit)}
                  divider={index > 0}
                />
              ))}
          </Stack>
        </Card>
      ))}

      {silent.length === 0 ? null : (
        <Card variant="sunken">
          <Stack gap="xs">
            <Text variant="subtitle">Not measured today</Text>
            <Text variant="bodySmall" tone="muted">
              {silent.map((item) => item.title).join(', ')}. These sensors run on a schedule or on
              demand — press Measure on the main screen to take a reading now.
            </Text>
          </Stack>
        </Card>
      )}
    </Stack>
  );
}

/** Разброс за день. У единственного замера его нет — и три одинаковых числа не нужны. */
function Range({ points, unit }: { points: readonly Point[]; unit: string }) {
  const summary = summaryOf(points);
  if (!summary || summary.count < 2) return null;

  return (
    <View style={styles.tiles}>
      <StatTile label="Min" value={String(summary.min)} unit={unit || undefined} />
      <StatTile label="Avg" value={String(summary.average)} unit={unit || undefined} />
      <StatTile label="Max" value={String(summary.max)} unit={unit || undefined} />
    </View>
  );
}

/** Процент пишется вплотную к числу, словесная единица — через пробел. */
function withUnit(value: number, unit: string): string {
  if (unit === '') return String(value);
  return unit === '%' ? `${value}%` : `${value} ${unit}`;
}

function time(at: Date): string {
  return at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tiles: {
    flexDirection: 'row',
    gap: space.sm,
  },
});
