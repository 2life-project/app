import AsyncStorage from '@react-native-async-storage/async-storage';

import { logger } from '@/core/log/logger';

import { averageHeartRate, type WorkoutSession } from './workout-session';

/**
 * Тренировки на телефоне.
 *
 * Хранить их обязаны мы: устройство занятие ведёт, но не сохраняет — после
 * финиша его список и сводка пусты. Если не записать здесь, тренировки не
 * останется нигде.
 */

const KEY = '2life:band-workouts';

/** Сколько занятий держим. Дальше их забирает сервер, а телефон — не архив. */
const KEEP = 50;

export type RecordedWorkout = {
  sport: number;
  startedAt: string;
  seconds: number;
  distance: number;
  calories: number;
  steps: number;
  averageHeartRate?: number;
  peakHeartRate?: number;
  /** Посекундный пульс: единственное, что менялось каждую секунду. */
  heartRates: number[];
};

export function toRecord(session: WorkoutSession): RecordedWorkout {
  return {
    sport: session.sport,
    startedAt: session.startedAt.toISOString(),
    seconds: session.seconds,
    distance: session.distance,
    calories: session.calories,
    steps: session.steps,
    averageHeartRate: averageHeartRate(session),
    peakHeartRate: session.peakHeartRate,
    heartRates: session.heartRates,
  };
}

export async function loadWorkouts(): Promise<RecordedWorkout[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw === null ? [] : (JSON.parse(raw) as RecordedWorkout[]);
  } catch (failure) {
    logger.warn('band: тренировки не прочитались', { failure });
    return [];
  }
}

/** Дописать занятие. Возвращает новый список, чтобы экран обновился сразу. */
export async function rememberWorkout(record: RecordedWorkout): Promise<RecordedWorkout[]> {
  const next = [...(await loadWorkouts()), record].slice(-KEEP);

  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch (failure) {
    // Тренировки нет больше нигде: на устройстве она не сохраняется вовсе.
    logger.error('band: тренировка не сохранилась', { failure });
  }

  return next;
}
