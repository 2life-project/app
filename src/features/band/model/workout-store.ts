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

/** Незавершённое занятие. Лежит отдельно: оно переживает закрытие приложения. */
const OPEN_KEY = '2life:band-workout-open';

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

/**
 * Дописать занятие.
 *
 * Бросает при отказе записи и **не** возвращает список как ни в чём не бывало:
 * тренировки нет больше нигде, устройство её не хранит. Показать человеку
 * сохранённое занятие, которого нет на диске, — худшее из возможных поведений.
 */
export async function rememberWorkout(record: RecordedWorkout): Promise<RecordedWorkout[]> {
  const next = [...(await loadWorkouts()), record].slice(-KEEP);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

/**
 * Сохранить незавершённое занятие.
 *
 * Пишется по ходу, а не только на финише: до сих пор тренировка жила в памяти
 * до нажатия «Завершить», и закрытие приложения, размонтирование экрана или
 * «забыть браслет» стирали её молча — при том что на экране написано, что она
 * сохранится.
 */
export async function saveOpenSession(session: WorkoutSession): Promise<void> {
  try {
    await AsyncStorage.setItem(OPEN_KEY, JSON.stringify(session));
  } catch (failure) {
    logger.error('band: незавершённая тренировка не сохранилась', { failure });
  }
}

/** Поднять занятие, прерванное закрытием приложения. */
export async function loadOpenSession(): Promise<WorkoutSession | undefined> {
  try {
    const raw = await AsyncStorage.getItem(OPEN_KEY);
    if (raw === null) return undefined;

    const stored = JSON.parse(raw) as Omit<WorkoutSession, 'startedAt'> & { startedAt: string };
    return { ...stored, startedAt: new Date(stored.startedAt) };
  } catch (failure) {
    logger.warn('band: незавершённая тренировка не прочиталась', { failure });
    return undefined;
  }
}

export async function clearOpenSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(OPEN_KEY);
  } catch (failure) {
    logger.warn('band: незавершённая тренировка не стёрлась', { failure });
  }
}
