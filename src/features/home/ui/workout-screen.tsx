import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { reportFailure } from '@/core/http/client';
import { useQuery } from '@/core/http/use-query';
import { createEvent, eventKey, eventTitle, fetchEvent } from '@/shared/domain';
import { longDay, useToday } from '@/shared/lib/day';
import { space } from '@/shared/theme';
import {
  ActionTile,
  Button,
  Card,
  Field,
  Screen,
  ScreenHeader,
  Stack,
  StatTile,
  Text,
} from '@/shared/ui';

import {
  WORKOUT_FORM,
  WORKOUT_TYPES,
  workoutInput,
  workoutTiles,
  type WorkoutFields,
} from '../model/workout';

/** Шапку рисует сам экран — как в макете, а не системная панель навигации. */
export const WorkoutScreenOptions = { headerShown: false };

/** `new` — ручное добавление (в день `date`), иначе записанная тренировка из журнала. */
export function WorkoutScreen({ id, date }: { id: string; date?: string }) {
  if (id === 'new') return <AddWorkout day={date} />;
  return <WorkoutDetail id={id} />;
}

/**
 * Тренировка — событие журнала. Показываем то, что сервер по ней измерил;
 * зоны пульса и кривую он не отдаёт, и рисовать их не из чего.
 */
function WorkoutDetail({ id }: { id: string }) {
  const { timeZone } = useToday();
  const query = useQuery(eventKey(id, timeZone), (signal) => fetchEvent(id, timeZone, signal));
  const event = query.data;
  const tiles = event ? workoutTiles(event) : [];

  return (
    <Screen>
      <Stack gap="md">
        <ScreenHeader
          title={event ? eventTitle(event) : 'Workout'}
          subtitle={
            event
              ? `${longDay(event.date)}${event.startAt ? ` · ${event.startAt.slice(11, 16)}` : ''}`
              : query.loading
                ? 'loading…'
                : 'did not load'
          }
        />

        {event ? (
          <Card>
            <Stack gap="sm">
              <Text variant="subtitle">Session</Text>
              {tiles.length === 0 ? (
                <Text tone="muted">Nothing measured for this session.</Text>
              ) : (
                <View style={styles.tiles}>
                  {tiles.map((tile) => (
                    <StatTile key={tile.label} {...tile} />
                  ))}
                </View>
              )}
            </Stack>
          </Card>
        ) : null}

        {event ? (
          <Card variant="flat">
            <Text variant="bodySmall" tone="muted">
              {`Source: ${event.source.name} · ${event.source.kind}`}
            </Text>
          </Card>
        ) : null}
      </Stack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  // Три в ряд: доля с поправкой на два зазора между плитками.
  typeCell: { width: '31%' },
});

/** Ручное добавление: тип, когда началась, сколько длилась. */
function AddWorkout({ day }: { day?: string }) {
  const { timeZone } = useToday();
  const [fields, setFields] = useState<WorkoutFields>({
    typeKey: WORKOUT_TYPES[0].id,
    time: '',
    duration: '',
    calories: '',
    distanceKm: '',
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const edit = (key: keyof WorkoutFields) => (next: string) => {
    setFields({ ...fields, [key]: next });
    setMessage(null);
  };

  const save = async () => {
    const input = workoutInput(fields, timeZone, day);
    if (!input) {
      setMessage(WORKOUT_FORM.invalid);
      return;
    }

    setBusy(true);
    try {
      await createEvent(input);
      router.back();
    } catch (failure) {
      // Набранное остаётся на экране: уходить при отказе значит потерять его.
      reportFailure('Тренировка не записалась', failure);
      setMessage(WORKOUT_FORM.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Stack gap="md">
        <ScreenHeader
          title="Add workout"
          subtitle={day ? `${longDay(day)} · the band missed this one` : 'the band missed this one'}
        />

        <Card>
          <Stack gap="sm">
            <Text variant="subtitle">Type</Text>
            <View style={styles.types}>
              {WORKOUT_TYPES.map((item) => (
                <View key={item.id} style={styles.typeCell}>
                  <ActionTile
                    icon={item.icon}
                    title={item.label}
                    onPress={() => edit('typeKey')(item.id)}
                  />
                </View>
              ))}
            </View>
            <Text variant="footnote" tone="muted">
              {WORKOUT_TYPES.find((item) => item.id === fields.typeKey)?.label}
            </Text>
          </Stack>
        </Card>

        <Card>
          <Stack gap="md">
            <Text variant="subtitle">Details</Text>
            <Field
              label={WORKOUT_FORM.time.label}
              hint={WORKOUT_FORM.time.hint}
              value={fields.time}
              onChangeText={edit('time')}
              keyboardType="numbers-and-punctuation"
            />
            <Field
              label={WORKOUT_FORM.duration.label}
              hint={WORKOUT_FORM.duration.hint}
              value={fields.duration}
              onChangeText={edit('duration')}
              keyboardType="number-pad"
            />
            <Field
              label={WORKOUT_FORM.calories.label}
              hint={WORKOUT_FORM.calories.hint}
              value={fields.calories}
              onChangeText={edit('calories')}
              keyboardType="number-pad"
            />
            <Field
              label={WORKOUT_FORM.distance.label}
              hint={WORKOUT_FORM.distance.hint}
              value={fields.distanceKm}
              onChangeText={edit('distanceKm')}
              keyboardType="decimal-pad"
            />
            {message ? <Text tone="danger">{message}</Text> : null}
          </Stack>
        </Card>

        <Button label="Add to today" loading={busy} onPress={() => void save()} />
      </Stack>
    </Screen>
  );
}
