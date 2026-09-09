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
import { byHour, thin } from '../model/day-metrics';
import { boutsOf } from '../model/detail';
import { clock, kilometres } from '../model/format';
import { cadenceSeries, walkOf } from '../model/walk-metrics';

/**
 * Разбор ходьбы: когда человек шёл, как быстро и какими отрезками.
 *
 * Дневной итог отвечает «сколько», а прогулки — «когда и как»: три часовых
 * выхода и восемь минутных перебежек дают одно число шагов и совершенно разные
 * дни.
 */
export function WalkDetail({ state }: { state: BandState }) {
  const walk = walkOf(state.today);
  const bouts = boutsOf(state.today);
  const cadence = cadenceSeries(state.today);
  const hours = byHour(state.today, (sample) => sample.steps);

  if (!walk) {
    return (
      <EmptyState
        title="No steps today"
        description="They appear as soon as the band counts them."
      />
    );
  }

  return (
    <Stack gap="md">
      <Card variant="sunken">
        <Stack gap="sm">
          <Text variant="subtitle">Steps by hour</Text>
          <BarChart
            markEmpty
            values={hours}
            highlightIndex={new Date().getHours()}
            axis={['00:00', '24:00']}
          />
          <View style={styles.tiles}>
            <StatTile label="STEPS" value={String(state.summary?.totals.steps ?? walk.steps)} />
            <StatTile
              label="DISTANCE"
              value={kilometres(state.summary?.totals.distance ?? walk.distance)}
              unit="km"
            />
          </View>
          <View style={styles.tiles}>
            <StatTile
              label="CALORIES"
              value={String(state.summary?.totals.calories ?? walk.calories)}
              unit="kcal"
            />
            <StatTile label="ACTIVE" value={`${walk.activeMinutes} min`} />
          </View>
        </Stack>
      </Card>

      {cadence.length > 1 ? (
        <Card variant="sunken">
          <Stack gap="sm">
            <Text variant="subtitle">Walking cadence</Text>
            <LineChart values={thin(cadence, 160)} tone="success" height={120} />
            <View style={styles.tiles}>
              <StatTile
                label="AVG"
                value={String(walk.cadenceAverage)}
                unit="spm"
                note={`peak ${walk.cadencePeak}`}
              />
              <StatTile
                label="STEP"
                value={walk.stride === null ? '—' : walk.stride.toFixed(2)}
                unit="m"
              />
            </View>
            <Text variant="caption" tone="muted">
              Stride is distance divided by steps — the band reports both per minute, so this is
              measured, not assumed.
            </Text>
          </Stack>
        </Card>
      ) : null}

      <Card variant="sunken">
        <Stack gap="sm">
          <Text variant="subtitle">Walks · {bouts.length}</Text>
          {bouts.length === 0 ? (
            <Text variant="bodySmall" tone="muted">
              Непрерывной ходьбы, достаточно длинной чтобы выделить, не нашлось.
            </Text>
          ) : (
            bouts
              .slice(0, 8)
              .map((bout, index) => (
                <SummaryRow
                  key={bout.from.getTime()}
                  title={`${clock(bout.from)} — ${clock(bout.to)}`}
                  subtitle={`${bout.minutes} min · ${bout.cadence} spm · ${bout.speed.toFixed(1)} km/h`}
                  value={`${bout.steps}`}
                  divider={index > 0}
                />
              ))
          )}
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
