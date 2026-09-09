import { StyleSheet, View } from 'react-native';

import { space } from '@/shared/theme';
import {
  BarChart,
  Card,
  EmptyState,
  LineChart,
  Stack,
  StatTile,
  SummaryRow,
  Text,
} from '@/shared/ui';

import type { BandState } from '../model/band-state';
import {
  HEART_RATE_ZONES,
  lastResting,
  seriesOf,
  summaryOf,
  thin,
  zonesOf,
} from '../model/day-metrics';
import { extremes, hourlyAverages } from '../model/detail';
import { clock, hourLabel } from '../model/format';

import { ZoneBars } from './zone-bars';

/** Сколько последних замеров показывать списком: дальше это уже выгрузка, а не чтение. */
const RECENT = 12;

/**
 * Разбор пульса за день: ход, разброс, зоны, часы и последние замеры.
 *
 * На обзорной карточке всё это не помещается и не нужно — там человек смотрит
 * «что сейчас». Сюда он проваливается с вопросом «а почему так».
 */
export function HeartDetail({ state }: { state: BandState }) {
  const points = seriesOf(state.today, (sample) => sample.heartRate ?? sample.averageHeartRate);
  const summary = summaryOf(points);
  const hours = hourlyAverages(points);
  const peak = extremes(hours);
  const resting = lastResting(state.today);

  if (!summary) {
    return (
      <EmptyState
        title="Пульса за сегодня нет"
        description="Браслет меряет его по расписанию и во время занятия. Нажмите «Замерить» на разделе, чтобы снять сейчас."
      />
    );
  }

  return (
    <Stack gap="md">
      <Card variant="sunken">
        <Stack gap="sm">
          <Text variant="subtitle">За день</Text>
          <LineChart values={thin(points, 200)} tone="danger" height={140} />
          <View style={styles.tiles}>
            <StatTile label="Минимум" value={String(summary.min)} unit="уд/мин" />
            <StatTile label="Среднее" value={String(summary.average)} unit="уд/мин" />
          </View>
          <View style={styles.tiles}>
            <StatTile label="Максимум" value={String(summary.max)} unit="уд/мин" />
            <StatTile
              label="Покой"
              value={resting === undefined ? '—' : String(resting)}
              unit="уд/мин"
            />
          </View>
        </Stack>
      </Card>

      <Card variant="sunken">
        <Stack gap="sm">
          <Text variant="subtitle">По часам</Text>
          <BarChart
            markEmpty
            values={hours.map((hour) => hour.value)}
            highlightIndex={new Date().getHours()}
            tone="danger"
            axis={['00:00', '24:00']}
          />
          {peak ? (
            <>
              <SummaryRow
                title="Самый спокойный час"
                subtitle={`замеров: ${peak.low.count}`}
                value={`${hourLabel(peak.low.hour)} · ${peak.low.value} уд/мин`}
              />
              <SummaryRow
                title="Самый нагруженный час"
                subtitle={`замеров: ${peak.high.count}`}
                value={`${hourLabel(peak.high.hour)} · ${peak.high.value} уд/мин`}
                divider
              />
            </>
          ) : null}
        </Stack>
      </Card>

      <Card variant="sunken">
        <Stack gap="sm">
          <Text variant="subtitle">Зоны</Text>
          <ZoneBars zones={zonesOf(points, HEART_RATE_ZONES)} all />
          <Text variant="caption" tone="muted">
            Доля сегодняшних замеров, попавших в каждый диапазон.
          </Text>
        </Stack>
      </Card>

      <Card variant="sunken">
        <Stack gap="sm">
          <Text variant="subtitle">Последние замеры</Text>
          {[...points]
            .slice(-RECENT)
            .reverse()
            .map((point, index) => (
              <SummaryRow
                key={point.at.getTime()}
                title={clock(point.at)}
                value={`${point.value} уд/мин`}
                divider={index > 0}
              />
            ))}
        </Stack>
      </Card>
    </Stack>
  );
}

const styles = StyleSheet.create({
  tiles: {
    flexDirection: 'row',
    gap: space.sm,
  },
});
