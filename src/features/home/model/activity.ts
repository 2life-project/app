import { formatNumber, NO_VALUE, readingsNote, type BandReadings } from '@/shared/domain';

import type { HomeData, MovementData } from '../api/contract';

import { dataOf, serverTone, type StatusTone } from './section';
import type { Tile } from './vitals';

/**
 * Раздел «Активность» читает движение дня: сервер отдаёт готовую оценку,
 * её составляющие и сами измерения. Шкала оценки в контракте не названа,
 * поэтому дуги у кольца нет — число есть, а доли от чего-то нет.
 */
export type ActivityView = {
  available: boolean;
  unavailableReason: string | null;
  /** Откуда взяты числа движения, когда их дал браслет. `null` — сервер. */
  bandNote: string | null;
  ring: { value: number | null; valueLabel: string; note?: string; tone?: StatusTone };
  /** `metric` — ключ из каталога показателей: по нему открывается его экран.
   *  У строк без ключа своего экрана нет, и вести им некуда. */
  rows: { id: string; title: string; subtitle?: string; value: string; metric?: string }[];
  tiles: Tile[];
  /** Чем посчитана оценка и на сколько полны данные — это часть самого числа. */
  algorithm: { name: string; coverage: string; confidence: string };
};

function minutes(value: number | null | undefined): string {
  return value === null || value === undefined ? NO_VALUE : `${formatNumber(value, 'count')} min`;
}

function amount(value: number | null | undefined, unit: string): string {
  return value === null || value === undefined ? NO_VALUE : formatNumber(value, unit);
}

/**
 * Движение за день.
 *
 * Браслет и сервер говорят об одном и том же дне, и правило между ними одно:
 * что браслет измерил сам — шаги, метры, энергию, — берётся с браслета, потому
 * что он был на руке; оценка движения и её составляющие остаются серверными,
 * их устройство не считает. Под числом стоит подпись об источнике: без неё
 * человек не поймёт, почему шаги здесь и в другом разделе разные.
 */
export function activityOf(home: HomeData, band: BandReadings | null = null): ActivityView | null {
  const movement: MovementData | null = dataOf(home.rings.movement);
  if (!movement) return null;

  const { metrics } = movement;
  const steps = band?.steps ?? metrics.steps;
  const distance = band?.distanceMeters ?? metrics.distanceMeters;
  const energy = band?.calories ?? metrics.activeEnergyKcal;
  const active = band?.activeMinutes ?? metrics.activeDurationMinutes;

  return {
    available: movement.available || band !== null,
    unavailableReason: movement.unavailableReason,
    bandNote: band === null ? null : readingsNote(band),
    ring: {
      value: null,
      valueLabel: amount(movement.score, 'score'),
      note: movement.band ?? undefined,
      tone: serverTone(movement.band),
    },
    rows: [
      {
        id: 'steps',
        metric: 'steps',
        title: 'Steps',
        subtitle: distance ? `${formatNumber(distance / 1000, 'km')} km` : undefined,
        value: amount(steps, 'count'),
      },
      {
        id: 'energy',
        metric: 'active_energy',
        title: 'Active energy',
        subtitle: 'kcal today',
        value: amount(energy, 'kcal'),
      },
      {
        id: 'exercise',
        title: 'Exercise',
        subtitle: 'minutes',
        value: minutes(metrics.exerciseDurationMinutes),
      },
    ],
    tiles: [
      { label: 'ACTIVE', value: minutes(active) },
      { label: 'MODERATE', value: minutes(metrics.moderateDurationMinutes) },
      { label: 'INTENSE', value: minutes(metrics.intenseDurationMinutes) },
      { label: 'STAND', value: amount(metrics.standHours, 'count'), unit: 'h' },
    ],
    algorithm: {
      name: movement.algorithmVersion,
      coverage: `${Math.round(movement.coverage * 100)}%`,
      confidence: `${Math.round(movement.confidence * 100)}%`,
    },
  };
}
