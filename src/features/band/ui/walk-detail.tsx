import { StyleSheet, View } from 'react-native';

import { space } from '@/shared/theme';
import { BarChart, Card, LineChart, Stack, StatTile, SummaryRow, Text } from '@/shared/ui';

import { byHour, thin } from '../model/day-metrics';
import { boutsOf } from '../model/detail';
import type { BandState } from '../model/use-band';
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
      <Card variant="sunken">
        <Text tone="muted">No steps recorded today.</Text>
      </Card>
    );
  }

  return (
    <Stack gap="md">
      <Card variant="sunken">
        <Stack gap="sm">
          <Text variant="subtitle">Steps by hour</Text>
          <BarChart
            values={hours}
            highlightIndex={new Date().getHours()}
            axis={['00:00', '24:00']}
          />
          <View style={styles.tiles}>
            <StatTile label="Steps" value={String(state.summary?.steps ?? walk.steps)} />
            <StatTile
              label="Distance"
              value={kilometres(state.summary?.distance ?? walk.distance)}
              unit="km"
            />
          </View>
          <View style={styles.tiles}>
            <StatTile
              label="Calories"
              value={String(state.summary?.calories ?? walk.calories)}
              unit="kcal"
            />
            <StatTile label="Active" value={`${walk.activeMinutes} min`} />
          </View>
        </Stack>
      </Card>

      {cadence.length > 1 ? (
        <Card variant="sunken">
          <Stack gap="sm">
            <Text variant="subtitle">Cadence while walking</Text>
            <LineChart values={thin(cadence, 160)} tone="success" height={120} />
            <View style={styles.tiles}>
              <StatTile
                label="Average"
                value={String(walk.cadenceAverage)}
                unit="spm"
                note={`peak ${walk.cadencePeak}`}
              />
              <StatTile
                label="Stride"
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
              No continuous walk long enough to stand out.
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

function kilometres(metres: number): string {
  return (Math.round(metres / 100) / 10).toFixed(1);
}

function clock(at: Date): string {
  return at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const styles = StyleSheet.create({
  tiles: {
    flexDirection: 'row',
    gap: space.sm,
  },
});
