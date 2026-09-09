import { useMemo } from 'react';

import { StatTile, Stack, Text } from '@/shared/ui';

import { stopwatch } from '../model/format';
import { averageHeartRate, type WorkoutSession } from '../model/workout-session';

/**
 * Идущее занятие.
 *
 * Числа приходят с браслета раз в секунду и нигде больше не сохраняются: после
 * финиша устройство отдаёт по этой тренировке нули. Поэтому экран показывает
 * ровно то, что уже накоплено на телефоне, а не запрашивает у браслета заново.
 */
export function WorkoutLive({ session }: { session: WorkoutSession }) {
  // Считается из бегущей суммы, но вызов всё равно на каждом кадре — раз в
  // секунду; память снимает и его.
  const average = useMemo(() => averageHeartRate(session), [session]);

  return (
    <Stack gap="sm">
      <Stack direction="row" gap="sm">
        <StatTile label="Время" value={stopwatch(session.seconds)} />
        <StatTile
          label="Пульс"
          value={session.heartRate === undefined ? '—' : String(session.heartRate)}
          unit="уд/мин"
        />
        <StatTile label="Шаги" value={String(session.steps)} />
      </Stack>

      <Stack direction="row" gap="sm">
        <StatTile label="Дистанция" value={String(session.distance)} unit="м" />
        <StatTile label="Средний" value={average === undefined ? '—' : String(average)} />
        <StatTile
          label="Пик"
          value={session.peakHeartRate === undefined ? '—' : String(session.peakHeartRate)}
        />
      </Stack>

      <Text variant="bodySmall" tone="muted">
        Пульс приходит каждую секунду, шаги и дистанция — реже. Занятие сохранится на телефоне:
        браслет его не хранит.
      </Text>
    </Stack>
  );
}
