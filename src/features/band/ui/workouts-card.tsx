import { useState } from 'react';

import { Button, RadioRow, Sheet, Stack, StatTile, Text, WidgetCard } from '@/shared/ui';

import type { ActivityState } from '../api';
import { stamp } from '../model/format';
import { sportOptions } from '../model/sport-choice';
import type { WorkoutSession } from '../model/workout-session';
import type { RecordedWorkout } from '../model/workout-store';

import { BandEmpty } from './band-empty';
import { WorkoutLive } from './workout-live';

const SHOWN = 3;

/**
 * Занятия и распознанная активность.
 *
 * Тренировку начинает приложение: кнопки старта у ES100 нет, автораспознавания
 * занятий тоже. Пока занятие идёт, браслет присылает данные раз в секунду —
 * и только в этот момент они существуют: в свою историю он их не пишет.
 *
 * Заходы движения — другое: их устройство размечает само и хранит у себя.
 */
export function WorkoutsCard({
  session,
  recorded,
  states,
  reading,
  live,
  onStart,
  onStop,
  onOpen,
}: {
  session?: WorkoutSession;
  recorded: readonly RecordedWorkout[];
  states: readonly ActivityState[];
  reading: boolean;
  live: boolean;
  onStart: (sport: number) => void;
  onStop: () => void;
  onOpen: () => void;
}) {
  const minutes = states.reduce((total, item) => total + item.minutes, 0);
  const has = states.length > 0 || recorded.length > 0;
  // Вид занятия спрашиваем перед стартом, а не после: прошивка считает шаги и
  // пульс одинаково для всех видов, и вид нужен нам самим — чтобы занятие
  // называлось в приложении так, как его назвал человек.
  const [picking, setPicking] = useState(false);

  return (
    <WidgetCard
      variant="sunken"
      title={session ? 'Workout in progress' : 'Activity'}
      caption={session ? undefined : 'bouts the band marks on its own'}
      action={has && !session ? { label: 'All', chevron: true, onPress: onOpen } : undefined}>
      <Stack gap="sm">
        {session ? <WorkoutLive session={session} /> : null}

        {!session && !has ? (
          <BandEmpty reading={reading} text="The band marked nothing in the last day" />
        ) : null}

        {!session && has ? (
          <Stack gap="sm">
            <Stack direction="row" gap="sm">
              <StatTile label="BOUTS" value={String(states.length)} />
              <StatTile label="MOVING" value={String(minutes)} unit="min" />
              <StatTile label="WORKOUTS" value={String(recorded.length)} />
            </Stack>

            {recorded
              .slice(-SHOWN)
              .reverse()
              .map((item) => (
                <Stack key={item.startedAt} direction="row" justify="space-between" align="center">
                  <Text variant="body">{stamp(new Date(item.startedAt))}</Text>
                  <Text variant="bodySmall" tone="muted">
                    {Math.round(item.seconds / 60)} min
                    {item.averageHeartRate === undefined ? '' : ` · ${item.averageHeartRate} bpm`}
                  </Text>
                </Stack>
              ))}
          </Stack>
        ) : null}

        {session ? (
          <Button label="Finish" onPress={onStop} />
        ) : (
          <Button
            label="Start a workout"
            variant="tonal"
            onPress={() => setPicking(true)}
            disabled={!live}
          />
        )}
      </Stack>

      <Sheet visible={picking} onClose={() => setPicking(false)} title="What are you doing?">
        <Stack gap="md">
          {sportOptions().map((option) => (
            <RadioRow
              key={option.code}
              title={option.name}
              selected={false}
              onPress={() => {
                setPicking(false);
                onStart(option.code);
              }}
            />
          ))}
          <Text variant="bodySmall" tone="muted">
            The band counts steps and heart rate the same way for every kind — this only names the
            workout here.
          </Text>
        </Stack>
      </Sheet>
    </WidgetCard>
  );
}
