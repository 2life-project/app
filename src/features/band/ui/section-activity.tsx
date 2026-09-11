import { useState } from 'react';

import { Banner, Stack } from '@/shared/ui';

import { useBand } from '../model/use-band';

import { BandDetails, type DetailKind } from './band-details';
import { WalkCard } from './walk-card';
import { WorkoutsCard } from './workouts-card';

/**
 * Что пошло не так с занятием — словами о последствии, а не о команде.
 *
 * Три состояния различаются тем, где сейчас находятся данные: не начали вовсе,
 * не записали на диск (единственная копия ещё в памяти), не закрыли на
 * устройстве (браслет продолжает считать и тратить заряд).
 */
const WORKOUT_TROUBLE: Record<string, { title: string; subtitle: string } | undefined> = {
  'workout-failed': {
    title: 'The band did not start the workout',
    subtitle: 'Nothing is being recorded. Try again while the band is connected.',
  },
  'workout-save-failed': {
    title: 'The workout did not save',
    subtitle:
      'It is still running here and exists only in the app — the band keeps no copy. Try finishing it again before closing the app.',
  },
  'workout-open': {
    title: 'The band is still in workout mode',
    subtitle:
      'Your workout is saved, but the device keeps counting and draining its battery until it hears otherwise. It closes on the next connection.',
  },
};

/**
 * Шаги и занятия браслета в «Активности» на Главной: сколько прошёл, что
 * устройство разметило само, начать и закончить тренировку.
 */
export function BandActivitySection() {
  const band = useBand();
  const [detail, setDetail] = useState<DetailKind>(null);
  if (!band.paired) return null;
  const { state } = band;
  const live = state.stage === 'connected';
  // Отказы занятия человек обязан увидеть: сессия существует только в памяти
  // приложения, устройство её не хранит, и молчание стоит целой тренировки.
  const trouble = WORKOUT_TROUBLE[state.problem ?? ''];

  return (
    <Stack gap="md">
      {trouble ? (
        <Banner
          tone={state.problem === 'workout-save-failed' ? 'danger' : 'warning'}
          checked={false}
          title={trouble.title}
          subtitle={trouble.subtitle}
        />
      ) : null}
      <WalkCard state={state} reading={state.busy} onOpen={() => setDetail('walk')} />
      <WorkoutsCard
        session={state.session}
        recorded={state.recorded}
        states={state.states}
        reading={state.busy}
        live={live}
        onStart={band.startWorkout}
        onStop={band.stopWorkout}
        onOpen={() => setDetail('workouts')}
      />
      <BandDetails kind={detail} state={state} onClose={() => setDetail(null)} />
    </Stack>
  );
}
