import { Button, Stack, StatTile, Text, WidgetCard } from '@/shared/ui';

import type { ActivityState } from '../api';
import { stamp } from '../model/format';
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
  onStart: () => void;
  onStop: () => void;
  onOpen: () => void;
}) {
  const minutes = states.reduce((total, item) => total + item.minutes, 0);
  const has = states.length > 0 || recorded.length > 0;

  return (
    <WidgetCard
      variant="sunken"
      title={session ? 'Тренировка идёт' : 'Активность'}
      caption={session ? undefined : 'заходы браслет размечает сам'}
      action={has && !session ? { label: 'Все', chevron: true, onPress: onOpen } : undefined}>
      <Stack gap="sm">
        {session ? <WorkoutLive session={session} /> : null}

        {!session && !has ? (
          <BandEmpty reading={reading} text="За сутки браслет ничего не разметил" />
        ) : null}

        {!session && has ? (
          <Stack gap="sm">
            <Stack direction="row" gap="sm">
              <StatTile label="Заходов" value={String(states.length)} />
              <StatTile label="В движении" value={String(minutes)} unit="мин" />
              <StatTile label="Тренировок" value={String(recorded.length)} />
            </Stack>

            {recorded
              .slice(-SHOWN)
              .reverse()
              .map((item) => (
                <Stack key={item.startedAt} direction="row" justify="space-between" align="center">
                  <Text variant="body">{stamp(new Date(item.startedAt))}</Text>
                  <Text variant="bodySmall" tone="muted">
                    {Math.round(item.seconds / 60)} мин
                    {item.averageHeartRate === undefined
                      ? ''
                      : ` · ${item.averageHeartRate} уд/мин`}
                  </Text>
                </Stack>
              ))}
          </Stack>
        ) : null}

        {session ? (
          <Button label="Завершить" onPress={onStop} />
        ) : (
          <Button label="Начать тренировку" variant="tonal" onPress={onStart} disabled={!live} />
        )}
      </Stack>
    </WidgetCard>
  );
}
