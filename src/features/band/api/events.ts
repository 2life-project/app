import type { ActivitySample } from './activity';
import type { Measurement } from './health';
import type { RecorderEvent } from './recorder';
import type { WorkoutTick } from './workouts';

/** Что устройство присылает само, без запроса. */
export type BandEvent =
  | { kind: 'activity'; sample: ActivitySample }
  | { kind: 'measurement'; measurement: Measurement }
  | { kind: 'wear'; worn: boolean; at: Date }
  /**
   * Секунда идущей тренировки. Приходит только пока занятие запущено, и это
   * единственный источник её данных: в историю устройство тренировку не пишет.
   */
  | { kind: 'workout'; tick: WorkoutTick }
  | { kind: 'recorder'; event: RecorderEvent }
  | { kind: 'disconnected' };

export type BandListener = (event: BandEvent) => void;
