import { StyleSheet, View } from 'react-native';

import { space } from '@/shared/theme';
import { BarChart, Card, Stack, StatTile, Text } from '@/shared/ui';

import { byHour } from '../model/day-metrics';
import type { BandState } from '../model/use-band';
import { walkOf } from '../model/walk-metrics';

/**
 * Ходьба: не сколько шагов, а как человек шёл.
 *
 * Браслет отдаёт шаги и метры за минуту — темп, длина шага и скорость из них
 * выводятся. Это то, чего в приложении вендора нет вовсе, хотя данные для него
 * устройство отдаёт с первого же дня.
 */
export function WalkCard({ state }: { state: BandState }) {
  const walk = walkOf(state.today);
  const hours = byHour(state.today, (sample) => sample.steps);

  if (!walk) {
    return (
      <Card variant="sunken">
        <Stack gap="xs">
          <Text variant="subtitle">Walking</Text>
          <Text variant="bodySmall" tone="muted">
            No steps recorded today yet.
          </Text>
        </Stack>
      </Card>
    );
  }

  return (
    <Card variant="sunken">
      <Stack gap="sm">
        <View style={styles.header}>
          <Text variant="subtitle">Walking</Text>
          <Text variant="bodySmall" tone="muted">
            {walk.activeMinutes} active min
          </Text>
        </View>

        <View style={styles.value}>
          <Text variant="metric">{String(walk.steps)}</Text>
          <Text variant="bodySmall" tone="muted">
            steps · {kilometres(walk.distance)} km · {walk.calories} kcal
          </Text>
        </View>

        <BarChart values={hours} highlightIndex={new Date().getHours()} axis={['00:00', '24:00']} />

        <View style={styles.tiles}>
          <StatTile
            label="Cadence"
            value={String(walk.cadenceAverage)}
            unit="spm"
            note={`peak ${walk.cadencePeak}`}
          />
          <StatTile
            label="Speed"
            value={walk.speedAverage === null ? '—' : walk.speedAverage.toFixed(1)}
            unit="km/h"
            note={walk.speedPeak === null ? undefined : `peak ${walk.speedPeak.toFixed(1)}`}
          />
          <StatTile
            label="Stride"
            value={walk.stride === null ? '—' : walk.stride.toFixed(2)}
            unit="m"
          />
          <StatTile label="Longest walk" value={`${walk.longestWalk}m`} />
        </View>
      </Stack>
    </Card>
  );
}

function kilometres(metres: number): string {
  return (Math.round(metres / 100) / 10).toFixed(1);
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  value: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: space.xs,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
});
