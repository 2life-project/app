import type { ActivitySample } from '@/core/band';

import type { Point } from './day-metrics';

/**
 * Ходьба, посчитанная из поминутных слотов.
 *
 * Браслет не отдаёт ни длину шага, ни скорость — он отдаёт шаги и метры за
 * минуту. Всё остальное выводится из этой пары, и считается здесь, чтобы
 * карточка и подписи не разошлись в округлениях.
 */

export type Walk = {
  /** Минут, в которые человек действительно шёл. */
  activeMinutes: number;
  steps: number;
  /** Метры. */
  distance: number;
  calories: number;
  /** Шагов в минуту: средняя и лучшая за день. */
  cadenceAverage: number;
  cadencePeak: number;
  /** Метры на шаг. Ниже 0.3 и выше 1.2 — это не ходьба, а тряска руки. */
  stride: number | null;
  /** Км/ч. */
  speedAverage: number | null;
  speedPeak: number | null;
  /** Самый длинный непрерывный отрезок ходьбы, минут. */
  longestWalk: number;
};

/** Минута считается ходьбой от этого числа шагов: ниже — это жесты рукой. */
const WALKING_STEPS = 20;

const MIN_STRIDE = 0.3;
const MAX_STRIDE = 1.2;

export function walkOf(samples: readonly ActivitySample[]): Walk | null {
  const active = samples.filter((sample) => (sample.steps ?? 0) >= WALKING_STEPS);

  let steps = 0;
  let distance = 0;
  let calories = 0;
  let cadencePeak = 0;
  let speedPeak = 0;

  for (const sample of samples) {
    steps += sample.steps ?? 0;
    distance += sample.distance ?? 0;
    calories += sample.calories ?? 0;
  }

  for (const sample of active) {
    cadencePeak = Math.max(cadencePeak, sample.steps ?? 0);
    speedPeak = Math.max(speedPeak, kmh(sample.distance ?? 0));
  }

  if (steps === 0) return null;

  const activeDistance = active.reduce((total, sample) => total + (sample.distance ?? 0), 0);
  const activeSteps = active.reduce((total, sample) => total + (sample.steps ?? 0), 0);

  return {
    activeMinutes: active.length,
    steps,
    distance,
    calories,
    cadenceAverage: active.length === 0 ? 0 : Math.round(activeSteps / active.length),
    cadencePeak,
    stride: strideOf(activeDistance, activeSteps),
    speedAverage: active.length === 0 ? null : round(kmh(activeDistance / active.length)),
    speedPeak: speedPeak === 0 ? null : round(speedPeak),
    longestWalk: longestRun(samples),
  };
}

/** Метры за минуту — в километры в час. */
function kmh(metresPerMinute: number): number {
  return (metresPerMinute * 60) / 1000;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Длина шага. Значение вне человеческого диапазона означает, что метры и шаги
 * посчитаны по разным окнам, а не что у человека шаг в два метра.
 */
function strideOf(distance: number, steps: number): number | null {
  if (steps === 0) return null;
  const stride = distance / steps;
  return stride < MIN_STRIDE || stride > MAX_STRIDE ? null : round(stride * 100) / 100;
}

/** Самая длинная цепочка подряд идущих активных минут. */
function longestRun(samples: readonly ActivitySample[]): number {
  const sorted = [...samples].sort((a, b) => a.at.getTime() - b.at.getTime());

  let best = 0;
  let current = 0;
  let previous: number | null = null;

  for (const sample of sorted) {
    const walking = (sample.steps ?? 0) >= WALKING_STEPS;
    const minute = Math.round(sample.at.getTime() / 60_000);
    // Разрыв во времени рвёт цепочку так же, как минута покоя: пропущенных
    // слотов в истории хватает, и склеивать их значит завышать прогулку.
    const contiguous = previous !== null && minute - previous === 1;

    current = walking && contiguous ? current + 1 : walking ? 1 : 0;
    best = Math.max(best, current);
    previous = minute;
  }

  return best;
}

/** Темп по минутам — для графика: он показывает не «сколько», а «как быстро». */
export function cadenceSeries(samples: readonly ActivitySample[]): Point[] {
  return samples
    .filter((sample) => (sample.steps ?? 0) >= WALKING_STEPS)
    .map((sample) => ({ at: sample.at, value: sample.steps ?? 0 }))
    .sort((a, b) => a.at.getTime() - b.at.getTime());
}
