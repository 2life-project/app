import type { BandState } from './use-band';

/** Пустое состояние раздела: связи нет, данных нет, ничего не делается. */
export const INITIAL: BandState = {
  stage: 'idle',
  found: [],
  sleep: [],
  today: [],
  stress: [],
  recordings: [],
  workouts: [],
  states: [],
  recorded: [],
  saved: [],
  recording: false,
  busy: false,
};
