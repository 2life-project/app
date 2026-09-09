import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '@/shared/theme';
import { ActionLink, BarChart, Card, Stack, StatTile, Text } from '@/shared/ui';

import { byHour } from '../model/day-metrics';
import type { BandState } from '../model/use-band';
import { walkOf } from '../model/walk-metrics';

/**
 * Ходьба: не сколько шагов, а как человек шёл.
 *
 * Браслет отдаёт шаги и метры за минуту — темп, длина шага и скорость из них
 * выводятся. Итоги дня при этом берём у самого устройства: оно считает их по
 * своим правилам, и два разных числа под одним словом «сегодня» доверия не
 * прибавляют.
 */
export function WalkCard({ state, onOpen }: { state: BandState; onOpen: () => void }) {
  // Оба прохода идут по всем минутам дня — до 1440 записей — и без памяти
  // повторяются на каждый живой отчёт, то есть раз в десять секунд.
  const walk = useMemo(() => walkOf(state.today), [state.today]);
  const hours = useMemo(() => byHour(state.today, (sample) => sample.steps), [state.today]);

  const steps = state.summary?.steps ?? walk?.steps ?? 0;
  const distance = state.summary?.distance ?? walk?.distance ?? 0;
  const calories = state.summary?.calories ?? walk?.calories ?? 0;

  return (
    <Card variant="sunken">
      <Stack gap="sm">
        <View style={styles.header}>
          <Text variant="subtitle">Ходьба</Text>
          <ActionLink label="Подробнее" chevron onPress={onOpen} disabled={!walk} />
        </View>

        {walk === null ? (
          <Text variant="bodySmall" tone="muted">
            Шагов за сегодня пока нет.
          </Text>
        ) : (
          <>
            <View style={styles.value}>
              <Text variant="metric">{String(steps)}</Text>
              <Text variant="bodySmall" tone="muted">
                steps · {kilometres(distance)} km · {calories} kcal
              </Text>
            </View>

            <BarChart
              values={hours}
              highlightIndex={new Date().getHours()}
              axis={['00:00', '24:00']}
            />

            <View style={styles.tiles}>
              <StatTile
                label="Каденс"
                value={String(walk.cadenceAverage)}
                unit="шаг/мин"
                note={`peak ${walk.cadencePeak}`}
              />
              <StatTile
                label="Скорость"
                value={walk.speedAverage === null ? '—' : walk.speedAverage.toFixed(1)}
                unit="km/h"
                note={walk.speedPeak === null ? undefined : `peak ${walk.speedPeak.toFixed(1)}`}
              />
            </View>
            <View style={styles.tiles}>
              <StatTile
                label="Длина шага"
                value={walk.stride === null ? '—' : walk.stride.toFixed(2)}
                unit="m"
              />
              <StatTile label="Активность" value={`${walk.activeMinutes} min`} />
            </View>
          </>
        )}
      </Stack>
    </Card>
  );
}

function kilometres(metres: number): string {
  return (Math.round(metres / 100) / 10).toFixed(1);
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
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
    gap: space.sm,
  },
});
