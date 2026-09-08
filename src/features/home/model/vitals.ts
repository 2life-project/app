import { formatNumber, metricFill, metricValueText, NO_VALUE } from '@/shared/domain';

import type { HomeData, MovementData, NutritionData, WellbeingData } from '../api/contract';

import { dataOf, serverTone, type StatusTone } from './section';

/**
 * Четыре стороны дня. В макете это RECOVERY, FUEL, STRAIN и DOSES, в контракте —
 * recovery, nutrition, movement и wellbeing: приёмов добавок отдельным кольцом
 * сервер не отдаёт, а самочувствие отдаёт. Поэтому четвёртое кольцо —
 * самочувствие: рисовать DOSES не из чего, а придумывать источник нельзя.
 */
export type RingView = {
  id: string;
  label: string;
  /** Доля дуги или `null`, когда шкалы для неё сервер не дал. */
  fill: number | null;
  valueLabel: string;
  tone?: StatusTone;
};

export type Tile = {
  label: string;
  value: string;
  unit?: string;
  note?: string;
};

/** Виджет одной системы: кольцо и две плитки — шаблон из макета. */
export type SystemView = {
  title: string;
  ring: { value: number | null; valueLabel: string; tone?: StatusTone };
  tiles: Tile[];
};

function movementOf(data: HomeData): MovementData | null {
  return dataOf(data.rings.movement);
}

function nutritionOf(data: HomeData): NutritionData | null {
  return dataOf(data.rings.nutrition);
}

function wellbeingOf(data: HomeData): WellbeingData | null {
  return dataOf(data.rings.wellbeing);
}

/** Число или прочерк: пустое место читается как незагруженный экран. */
function text(value: number | null | undefined, unit: string): string {
  return value === null || value === undefined ? NO_VALUE : formatNumber(value, unit);
}

/**
 * Доля съеденного от цели. Цель может быть не задана — тогда сравнивать не с
 * чем, и кольцо остаётся без дуги, а не заполняется «примерно».
 */
function fuelFill(nutrition: NutritionData | null): number | null {
  const goal = nutrition?.goals.calories;
  const eaten = nutrition?.totals.calories;
  if (!goal || goal <= 0 || eaten === null || eaten === undefined) return null;
  return Math.min(1, eaten / goal);
}

export function ringsOf(data: HomeData | null): readonly RingView[] {
  if (!data) return [];

  const movement = movementOf(data);
  const nutrition = nutritionOf(data);
  const wellbeing = wellbeingOf(data);
  const recovery = data.rings.recovery;
  const fuel = fuelFill(nutrition);

  return [
    {
      id: 'recovery',
      label: 'RECOVERY',
      fill: metricFill(recovery),
      valueLabel: metricValueText(recovery),
    },
    {
      // В кольце стоит доля от цели, а не сами калории: четырёхзначное число
      // в кольцо не помещается, а без цели показывать долю не от чего.
      id: 'fuel',
      label: 'FUEL',
      fill: fuel,
      valueLabel:
        fuel === null ? text(nutrition?.totals.calories, 'kcal') : String(Math.round(fuel * 100)),
      tone: serverTone(nutrition?.insight.tone),
    },
    {
      // Шкала movement-оценки в контракте не названа, поэтому дуги нет:
      // 12 из скольки — знает только сервер, и он этого пока не сказал.
      id: 'strain',
      label: 'STRAIN',
      fill: null,
      valueLabel: text(movement?.score, 'score'),
      tone: serverTone(movement?.band),
    },
    {
      id: 'wellbeing',
      label: 'WELLBEING',
      fill: null,
      valueLabel: text(wellbeing?.score, 'score'),
      tone: serverTone(wellbeing?.recommendation.tone),
    },
  ];
}

/** Виджет восстановления: кольцо метрики и то, на чём её число стоит. */
export function recoverOf(data: HomeData): SystemView {
  const recovery = data.rings.recovery;

  return {
    title: 'Recovery',
    ring: { value: metricFill(recovery), valueLabel: metricValueText(recovery) },
    tiles: [],
  };
}

export function moveOf(data: HomeData): SystemView {
  const movement = movementOf(data);
  const metrics = movement?.metrics;
  const distance = metrics?.distanceMeters;

  return {
    title: 'Movement',
    ring: {
      value: null,
      valueLabel: text(movement?.score, 'score'),
      tone: serverTone(movement?.band),
    },
    tiles: [
      {
        label: 'STEPS',
        value: text(metrics?.steps, 'count'),
        note: distance ? `${formatNumber(distance / 1000, 'km')} km` : undefined,
      },
      {
        label: 'ACTIVE',
        value: text(metrics?.activeEnergyKcal, 'kcal'),
        unit: 'kcal',
      },
    ],
  };
}
