import type { EventValue, JournalEvent, NewEvent } from '@/shared/domain';

/**
 * Тренировка руками: то, что браслет пропустил. Уезжает событием журнала
 * вида `workout`; сервер сам считает по ней нагрузку и кладёт в день.
 * Оценку нагрузки заранее не показываем: считать её из длительности и
 * усилия значит показать число, которого сервер не говорил.
 */
export const WORKOUT_TYPES = [
  { id: 'strength', icon: 'activity', label: 'Strength' },
  { id: 'run', icon: 'wind', label: 'Run' },
  { id: 'walk', icon: 'navigation', label: 'Walk' },
  { id: 'cycle', icon: 'disc', label: 'Cycle' },
  { id: 'swim', icon: 'droplet', label: 'Swim' },
  { id: 'yoga', icon: 'sun', label: 'Yoga' },
] as const;

/** Поля формы. Экрана в макете нет — формулировки рабочие. */
export const WORKOUT_FORM = {
  time: { label: 'Started', hint: '17:05 · today' },
  duration: { label: 'Duration, min', hint: '45' },
  calories: { label: 'Calories, kcal', hint: 'optional' },
  distance: { label: 'Distance, km', hint: 'optional' },
  invalid: 'Time is HH:MM and duration is whole minutes.',
  saveFailed: 'The workout did not save. Try again.',
} as const;

export type WorkoutFields = {
  typeKey: string;
  time: string;
  duration: string;
  calories: string;
  distanceKm: string;
};

const TIME = /^(\d{1,2}):(\d{2})$/;

function wholeNumber(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const value = Number(trimmed);
  return Number.isInteger(value) && value >= 0 ? value : null;
}

/**
 * Событие из полей или `null`, если они не читаются. Время — сегодняшнее:
 * тренировку вчерашнего дня записывают из журнала, выбрав день.
 */
export function workoutInput(
  fields: WorkoutFields,
  timeZone: string,
  now = new Date(),
): NewEvent | null {
  const match = TIME.exec(fields.time.trim());
  const hours = Number(match?.[1]);
  const minutes = Number(match?.[2]);
  if (!match || hours > 23 || minutes > 59) return null;

  const duration = wholeNumber(fields.duration);
  if (duration === null || duration === 0) return null;

  const calories = fields.calories.trim() === '' ? undefined : wholeNumber(fields.calories);
  if (calories === null) return null;

  const km = fields.distanceKm.trim() === '' ? undefined : Number(fields.distanceKm.trim());
  if (km !== undefined && !(km >= 0)) return null;

  const startAt = new Date(now);
  startAt.setHours(hours, minutes, 0, 0);

  return {
    startAt: startAt.toISOString(),
    timezone: timeZone,
    event: {
      kind: 'workout',
      typeKey: fields.typeKey,
      durationMinutes: duration,
      ...(calories === undefined ? {} : { caloriesKcal: calories }),
      ...(km === undefined ? {} : { distanceMeter: Math.round(km * 1000) }),
    },
  };
}

export type WorkoutTile = { label: string; value: string; unit?: string };

/**
 * Измеренное — плитками. Что именно сервер измерил, знает только он: ключи
 * не переводятся в придуманный список, а показываются как названы.
 */
export function workoutTiles(event: JournalEvent): WorkoutTile[] {
  return event.values
    .filter((value): value is EventValue & { value: number | string } => value.value !== null)
    .map((value) => ({
      label: value.key.replace(/[_.]/g, ' ').toUpperCase(),
      value: String(value.value),
      unit: value.unit,
    }));
}
