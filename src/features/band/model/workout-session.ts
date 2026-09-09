import type { WorkoutTick } from '../api';

/**
 * Накопление тренировки на клиенте.
 *
 * Браслет ведёт занятие, но никуда его не пишет: после финиша список и сводка
 * на устройстве остаются пустыми — проверено на живом ES100 дважды. Поэтому
 * единственный экземпляр тренировки существует здесь, и потерять его нельзя.
 */

export type WorkoutSession = {
  sport: number;
  startedAt: Date;
  /** Секунд с начала по счётчику устройства. */
  seconds: number;
  /** Метры и килокалории — последние значения, а не разница соседних тиков. */
  distance: number;
  calories: number;
  steps: number;
  heartRate?: number;
  peakHeartRate?: number;
  /** Посекундный ряд пульса: только он и меняется каждую секунду. */
  heartRates: number[];
};

export function startSession(sport: number, at: Date = new Date()): WorkoutSession {
  return {
    sport,
    startedAt: at,
    seconds: 0,
    distance: 0,
    calories: 0,
    steps: 0,
    heartRates: [],
  };
}

/**
 * Принять секунду занятия.
 *
 * Шаги, дистанция и калории приходят нарастающим итогом и подолгу не меняются —
 * их берём как есть. Пульс обновляется каждую секунду, и только он образует
 * ряд: считать по нему разницу бессмысленно, а копить — единственный способ
 * потом показать, как шла нагрузка.
 */
export function applyTick(session: WorkoutSession, tick: WorkoutTick): WorkoutSession {
  const next: WorkoutSession = {
    ...session,
    seconds: Math.max(session.seconds, tick.seconds),
    distance: tick.distance ?? session.distance,
    calories: tick.calories ?? session.calories,
    steps: tick.steps ?? session.steps,
    heartRate: tick.heartRate ?? session.heartRate,
    heartRates: session.heartRates,
  };

  if (tick.heartRate !== undefined) {
    next.heartRates = [...session.heartRates, tick.heartRate];
    next.peakHeartRate = Math.max(session.peakHeartRate ?? 0, tick.heartRate);
  }

  return next;
}

/** Средний пульс за занятие. Устройство своё считает по-своему, это наше. */
export function averageHeartRate(session: WorkoutSession): number | undefined {
  if (session.heartRates.length === 0) return undefined;
  const total = session.heartRates.reduce((sum, value) => sum + value, 0);
  return Math.round(total / session.heartRates.length);
}
