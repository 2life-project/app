import AsyncStorage from '@react-native-async-storage/async-storage';

import { logger } from '@/core/log/logger';

import type { ActivitySample } from '../api';

import { appendSample, startOfToday } from './day-metrics';

/**
 * Архив поминутной истории на телефоне.
 *
 * Устройство хранит около четырёх суток и затирает старое молча. Значит
 * непрерывность обеспечивает не браслет, а то, что телефон успел вычитать: не
 * открывал приложение неделю — недели не существует, и взять её больше
 * неоткуда. Поэтому прочитанные сутки складываются на диск сразу и остаются
 * там, даже когда на устройстве их уже нет.
 *
 * Форма записи — та же, в которой сутки уедут на сервер, когда появится
 * приёмник: сутки целиком, с отметкой, когда их прочитали, и с адресом
 * устройства. Пересобирать формат потом значило бы разбирать на лету то, что
 * уже лежит на дисках у людей.
 */

/** Сколько суток назад имеет смысл дочитывать: глубже устройство не хранит. */
export const HISTORY_DAYS = 4;

const PREFIX = '2life:band-day.1:';

export type StoredDay = {
  /** `YYYY-MM-DD` по часам телефона: сутки считает телефон, браслет пояса не знает. */
  date: string;
  /** Адрес устройства. Сменили браслет — сутки не смешиваются в одну кучу. */
  mac?: string;
  /** Когда эти сутки прочитали с устройства. По нему видно, дочитаны ли они до конца. */
  readAt: string;
  samples: ActivitySample[];
};

const ISO = /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/;

function revive(_key: string, value: unknown): unknown {
  return typeof value === 'string' && ISO.test(value) ? new Date(value) : value;
}

/** `YYYY-MM-DD` по местным часам: сервер и устройство считают сутки одинаково. */
export function dayKey(at: Date): string {
  const year = at.getFullYear();
  const month = String(at.getMonth() + 1).padStart(2, '0');
  const day = String(at.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Последние сутки, которые ещё могут лежать на устройстве, от старых к новым. */
export function recentDays(now = new Date(), depth = HISTORY_DAYS): string[] {
  const midnight = startOfToday(now);
  const days: string[] = [];

  for (let back = depth - 1; back >= 0; back -= 1) {
    days.push(dayKey(new Date(midnight.getTime() - back * 24 * 60 * 60 * 1000)));
  }
  return days;
}

/**
 * Нужно ли перечитывать эти сутки.
 *
 * Сегодняшние — всегда: день ещё идёт. Прошлые — только если их не читали
 * вовсе или читали, пока они не кончились: в тот момент вечерних минут ещё
 * не существовало, и запись обрывается на времени чтения.
 */
export function needsRead(day: string, stored: StoredDay | null, now = new Date()): boolean {
  if (day === dayKey(now)) return true;
  if (!stored) return true;

  const read = new Date(stored.readAt);
  if (Number.isNaN(read.getTime())) return true;

  // Сутки закончились в полночь следующего дня — с этого момента запись полна.
  const [year, month, date] = day.split('-').map(Number);
  if (!year || !month || !date) return true;
  return read < new Date(year, month - 1, date + 1);
}

export async function loadDay(day: string): Promise<StoredDay | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + day);
    return raw === null ? null : (JSON.parse(raw, revive) as StoredDay);
  } catch (failure) {
    logger.warn('band: сутки истории не прочитались', { day, failure });
    return null;
  }
}

/**
 * Сложить сутки на диск, слив с тем, что уже лежит.
 *
 * Слияние, а не замена: чтение могло оборваться на середине, и второй заход
 * приносит недостающие минуты, а не весь день заново. Правило слияния — то же,
 * что у экрана: минута из истории сильнее живого отчёта.
 */
export async function rememberDay(
  day: string,
  samples: readonly ActivitySample[],
  mac?: string,
): Promise<StoredDay> {
  const stored = await loadDay(day);
  const merged = samples.reduce<ActivitySample[]>(
    (acc, sample) => appendSample(acc, sample),
    stored?.samples ?? [],
  );

  const record: StoredDay = {
    date: day,
    mac: mac ?? stored?.mac,
    readAt: new Date().toISOString(),
    samples: merged,
  };

  try {
    await AsyncStorage.setItem(PREFIX + day, JSON.stringify(record));
  } catch (failure) {
    logger.warn('band: сутки истории не сохранились', { day, failure });
  }
  return record;
}

/** Какие сутки лежат на телефоне. Это и есть окно покрытия: чего здесь нет — того нет нигде. */
export async function coveredDays(): Promise<string[]> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    return keys
      .filter((key) => key.startsWith(PREFIX))
      .map((key) => key.slice(PREFIX.length))
      .sort();
  } catch (failure) {
    logger.warn('band: список суток не прочитался', { failure });
    return [];
  }
}

export async function clearHistory(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  await AsyncStorage.multiRemove(keys.filter((key) => key.startsWith(PREFIX))).catch(
    () => undefined,
  );
}
