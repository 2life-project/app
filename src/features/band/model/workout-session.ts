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
  /** Бегущие сумма и счёт для среднего: без них среднее считалось бы проходом. */
  beatSum: number;
  beats: number;
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
    beatSum: 0,
    beats: 0,
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
  };

  if (tick.heartRate === undefined) return next;

  next.peakHeartRate = Math.max(session.peakHeartRate ?? 0, tick.heartRate);
  next.beats = session.beats + 1;
  next.beatSum = session.beatSum + tick.heartRate;

  // Ряд копится дописыванием в тот же массив, а не пересборкой.
  //
  // Кадр приходит раз в секунду, и копия ряда на каждый кадр давала бы
  // квадратичный рост: двухчасовое занятие — миллионы копирований элементов и
  // рывок отрисовки на каждой секунде. Мутация здесь безопасна: массив создан
  // этим модулем и наружу отдаётся только для чтения.
  session.heartRates.push(tick.heartRate);
  next.heartRates = session.heartRates;

  return next;
}

/**
 * Средний пульс за занятие.
 *
 * Считается из бегущей суммы, а не проходом по ряду: проход на каждом кадре
 * при часовой тренировке — это тысячи проходов по тысячам элементов.
 */
export function averageHeartRate(session: WorkoutSession): number | undefined {
  if (session.beats === 0) return undefined;
  return Math.round(session.beatSum / session.beats);
}
