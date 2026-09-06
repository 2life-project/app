import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '@/shared/theme';
import {
  ActionLink,
  ActionTile,
  Button,
  Card,
  Field,
  LineChart,
  ProgressBar,
  RingPanel,
  Screen,
  ScreenHeader,
  Stack,
  StatTile,
  Text,
} from '@/shared/ui';

import {
  ESTIMATED_STRAIN,
  WORKOUT,
  WORKOUT_FIELDS,
  WORKOUT_TYPES,
  ZONE_PEAK,
} from '../model/workout';

/** Шапку рисует сам экран — как в макете, а не системная панель навигации. */
export const WorkoutScreenOptions = { headerShown: false };

/** `new` — ручное добавление, иначе разбор уже записанной тренировки. */
export function WorkoutScreen({ id }: { id: string }) {
  if (id === 'new') return <AddWorkout />;

  return (
    <Screen>
      <Stack gap="md">
        <ScreenHeader title={WORKOUT.title} subtitle={WORKOUT.when} />

        <RingPanel
          title="Session strain"
          caption={WORKOUT.strain.caption}
          ring={{
            value: WORKOUT.strain.value / WORKOUT.strain.of,
            valueLabel: String(WORKOUT.strain.value),
            note: `of ${WORKOUT.strain.of}`,
          }}
          rows={WORKOUT.rows.map((row) => ({ ...row, onPress: () => {} }))}
        />

        <Card>
          <Stack gap="sm">
            <Text variant="subtitle">Session</Text>
            <View style={styles.tiles}>
              {WORKOUT.tiles.slice(0, 2).map((tile) => (
                <StatTile key={tile.label} {...tile} />
              ))}
            </View>
            <View style={styles.tiles}>
              {WORKOUT.tiles.slice(2).map((tile) => (
                <StatTile key={tile.label} {...tile} />
              ))}
            </View>
          </Stack>
        </Card>

        <Card>
          <Stack gap="sm">
            <Text variant="subtitle">Heart-rate zones</Text>
            {WORKOUT.zones.map((zone) => (
              <View key={zone.id} style={styles.zone}>
                <Text variant="bodySmall" style={styles.zoneLabel}>
                  {zone.label}
                </Text>
                <View style={styles.zoneBar}>
                  <ProgressBar value={zone.minutes / ZONE_PEAK} />
                </View>
                <Text variant="bodySmall" tone="muted" style={styles.zoneValue}>
                  {zone.minutes} min
                </Text>
              </View>
            ))}
          </Stack>
        </Card>

        <Card>
          <Stack gap="md">
            <Stack direction="row" justify="space-between" align="center">
              <Text variant="subtitle">Heart rate</Text>
              <Text variant="bodySmall" tone="muted">
                {WORKOUT.duration}
              </Text>
            </Stack>
            <LineChart values={WORKOUT.curve} />
          </Stack>
        </Card>

        <Card variant="flat">
          <Stack direction="row" justify="space-between" align="center">
            <Text variant="bodySmall" tone="muted">
              {WORKOUT.source}
            </Text>
            <ActionLink label="Edit" onPress={() => {}} />
          </Stack>
        </Card>
      </Stack>
    </Screen>
  );
}

const ZONE_LABEL = 52;
const ZONE_VALUE = 48;

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: space.sm },
  zone: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  zoneLabel: { width: ZONE_LABEL },
  zoneBar: { flex: 1 },
  zoneValue: { width: ZONE_VALUE, textAlign: 'right' },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  // Три в ряд: доля с поправкой на два зазора между плитками.
  typeCell: { width: '31%' },
});

/** Ручное добавление тренировки: тип, детали, оценка нагрузки. */
function AddWorkout() {
  const [type, setType] = useState<string>(WORKOUT_TYPES[0].id);

  return (
    <Screen>
      <Stack gap="md">
        <ScreenHeader title="Add workout" subtitle="the band missed this one" />

        <Card>
          <Stack gap="sm">
            <Text variant="subtitle">Type</Text>
            <View style={styles.types}>
              {WORKOUT_TYPES.map((item) => (
                <View key={item.id} style={styles.typeCell}>
                  <ActionTile
                    icon={item.icon}
                    title={item.label}
                    onPress={() => setType(item.id)}
                  />
                </View>
              ))}
            </View>
            <Text variant="footnote" tone="muted">
              {WORKOUT_TYPES.find((item) => item.id === type)?.label}
            </Text>
          </Stack>
        </Card>

        <Card>
          <Stack gap="md">
            <Text variant="subtitle">Details</Text>
            {WORKOUT_FIELDS.map((field) => (
              <Field key={field.id} label={field.label} hint={field.hint} />
            ))}
          </Stack>
        </Card>

        <Card>
          <Stack gap="sm">
            <Stack direction="row" justify="space-between" align="center">
              <Text variant="subtitle">{ESTIMATED_STRAIN.title}</Text>
              <Stack direction="row" gap="xs" align="baseline">
                <Text variant="headline">{ESTIMATED_STRAIN.value}</Text>
                <Text variant="bodySmall" tone="muted">
                  {ESTIMATED_STRAIN.of}
                </Text>
              </Stack>
            </Stack>
            <Text tone="muted">{ESTIMATED_STRAIN.text}</Text>
          </Stack>
        </Card>

        <Button label="Add to today" onPress={() => router.back()} />
      </Stack>
    </Screen>
  );
}
