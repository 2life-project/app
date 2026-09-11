import AsyncStorage from '@react-native-async-storage/async-storage';

import { logger } from '@/core/log/logger';

import type { SleepSegment, SleepSession } from '../api';

/**
 * Ночи, которые телефон уже видел.
 *
 * Браслет помнит около четырёх суток, а раздел восстановления должен
 * показывать историю сна целиком: ночь, прочитанная однажды, остаётся на
 * телефоне и после того, как устройство её затёрло.
 */

const KEY = '2life:band-nights.1';

/** Сколько ночей держать: глубже трёх месяцев историю сна глазами не читают. */
const NIGHTS_LIMIT = 90;

/** Та же ночь на диске: даты — строками, JSON их не знает. */
type StoredNight = Omit<SleepSession, 'from' | 'to' | 'segments'> & {
  from: string;
  to: string;
  segments: (Omit<SleepSegment, 'at'> & { at: string })[];
};

/** Ночь узнаётся по засыпанию: две ночи с одним началом — одна и та же ночь. */
export function nightKey(night: SleepSession): number {
  return night.from.getTime();
}

function pack(night: SleepSession): StoredNight {
  return {
    ...night,
    from: night.from.toISOString(),
    to: night.to.toISOString(),
    segments: night.segments.map((segment) => ({ ...segment, at: segment.at.toISOString() })),
  };
}

function unpack(stored: StoredNight): SleepSession {
  return {
    ...stored,
    from: new Date(stored.from),
    to: new Date(stored.to),
    segments: stored.segments.map((segment) => ({ ...segment, at: new Date(segment.at) })),
  };
}

/**
 * Свести известное с прочитанным. Свежее чтение точнее: устройство дочитывает
 * ночь, пока человек спит, и утренняя версия полнее ночной.
 */
export function mergeNights(
  known: readonly SleepSession[],
  fresh: readonly SleepSession[],
): SleepSession[] {
  const byNight = new Map(known.map((night) => [nightKey(night), night]));
  for (const night of fresh) byNight.set(nightKey(night), night);
  return [...byNight.values()]
    .sort((a, b) => a.from.getTime() - b.from.getTime())
    .slice(-NIGHTS_LIMIT);
}

export async function loadNights(): Promise<SleepSession[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw === null ? [] : (JSON.parse(raw) as StoredNight[]).map(unpack);
  } catch (failure) {
    logger.warn('band: история сна не прочиталась', { failure });
    return [];
  }
}

/** Запомнить прочитанные ночи. Возвращает историю целиком. */
export async function rememberNights(fresh: readonly SleepSession[]): Promise<SleepSession[]> {
  const merged = mergeNights(await loadNights(), fresh);
  await AsyncStorage.setItem(KEY, JSON.stringify(merged.map(pack))).catch((failure: unknown) =>
    logger.warn('band: история сна не сохранилась', { failure }),
  );
  return merged;
}

export function clearNights(): Promise<void> {
  return AsyncStorage.removeItem(KEY).catch(() => undefined);
}
