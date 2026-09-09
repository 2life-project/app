import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '@/shared/theme';
import { ActionLink, BarChart, Card, Stack, StatTile, Text } from '@/shared/ui';

import type { BandState } from '../model/band-state';
import { byHour } from '../model/day-metrics';
import { kilometres } from '../model/format';
import { walkOf } from '../model/walk-metrics';

import { BandEmpty } from './band-empty';

/**
 * Ходьба: не сколько шагов, а как человек шёл.
 *
 * Браслет отдаёт шаги и метры за минуту — темп, длина шага и скорость из них
 * выводятся. Итоги дня при этом берём у самого устройства: оно считает их по
 * своим правилам, и два разных числа под одним словом «сегодня» доверия не
 * прибавляют.
 */
export function WalkCard({
  state,
  reading,
  onOpen,
}: {
  state: BandState;
  reading: boolean;
  onOpen: () => void;
}) {
  // Оба прохода идут по всем минутам дня — до 1440 записей — и без памяти
  // повторяются на каждый живой отчёт, то есть раз в десять секунд.
  const walk = useMemo(() => walkOf(state.today), [state.today]);
  const hours = useMemo(() => byHour(state.today, (sample) => sample.steps), [state.today]);

  const steps = state.summary?.totals.steps ?? walk?.steps ?? 0;
  const distance = state.summary?.totals.distance ?? walk?.distance ?? 0;
  const calories = state.summary?.totals.calories ?? walk?.calories ?? 0;

  return (
    <Card variant="sunken">
      <Stack gap="sm">
        <View style={styles.header}>
          <Text variant="subtitle">Walking</Text>
          <ActionLink label="Details" chevron onPress={onOpen} disabled={!walk} />
        </View>

        {walk === null ? (
          <BandEmpty reading={reading} text="No steps today yet" />
        ) : (
          <>
            <View style={styles.value}>
              <Text variant="metric">{String(steps)}</Text>
              <Text variant="bodySmall" tone="muted">
                steps · {kilometres(distance)} km · {calories} kcal
              </Text>
            </View>

            <BarChart
              markEmpty
              values={hours}
              highlightIndex={new Date().getHours()}
              axis={['00:00', '24:00']}
            />

            <View style={styles.tiles}>
              <StatTile
                label="CADENCE"
                value={String(walk.cadenceAverage)}
                unit="spm"
                note={`пик ${walk.cadencePeak}`}
              />
              <StatTile
                label="PACE"
                value={walk.speedAverage === null ? '—' : walk.speedAverage.toFixed(1)}
                unit="km/h"
                note={walk.speedPeak === null ? undefined : `пик ${walk.speedPeak.toFixed(1)}`}
              />
            </View>
            <View style={styles.tiles}>
              <StatTile
                label="STEP"
                value={walk.stride === null ? '—' : walk.stride.toFixed(2)}
                unit="m"
              />
              <StatTile label="ACTIVE" value={`${walk.activeMinutes} min`} />
            </View>
          </>
        )}
      </Stack>
    </Card>
  );
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
