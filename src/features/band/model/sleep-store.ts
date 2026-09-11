import AsyncStorage from '@react-native-async-storage/async-storage';

import { currentUser } from '@/core/auth';
import { logger } from '@/core/log/logger';

import type { SleepSegment, SleepSession } from '../api';

import { serial } from './serial';

/**
 * Ночи, которые телефон уже видел.
 *
 * Браслет помнит около четырёх суток, а раздел восстановления должен
 * показывать историю сна целиком: ночь, прочитанная однажды, остаётся на
 * телефоне и после того, как устройство её затёрло. Ключ — по аккаунту:
 * телефоном пользуются двое, и ночи одного не должны достаться другому.
 */

const PREFIX = '2life:band-nights.1:';

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

function keyOf(): string | null {
  const account = currentUser()?.id;
  return account ? `${PREFIX}${account}` : null;
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
  const key = keyOf();
  if (!key) return [];

  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(key);
    return raw === null ? [] : (JSON.parse(raw) as StoredNight[]).map(unpack);
  } catch (failure) {
    // Битую историю нельзя затереть следующей записью молча: в ней ночи,
    // которых на браслете уже нет. Копия — под соседний ключ, для разбора.
    logger.error('band: история сна не прочиталась, отложена', { failure });
    if (raw !== null) {
      await AsyncStorage.setItem(`${key}:broken`, raw).catch((reason: unknown) =>
        logger.error('band: копия битой истории сна не сохранилась', { reason }),
      );
    }
    return [];
  }
}

/** Запомнить прочитанные ночи. Возвращает историю целиком. */
export function rememberNights(fresh: readonly SleepSession[]): Promise<SleepSession[]> {
  // Под общим замком: чтение и запись внахлёст теряли бы ночи одного из чтений.
  return serial(async () => {
    const key = keyOf();
    const merged = mergeNights(await loadNights(), fresh);
    if (!key) return merged;

    await AsyncStorage.setItem(key, JSON.stringify(merged.map(pack))).catch((failure: unknown) =>
      logger.error('band: история сна не сохранилась', { failure }),
    );
    return merged;
  });
}

export async function clearNights(): Promise<void> {
  const key = keyOf();
  if (!key) return;
  await AsyncStorage.removeItem(key).catch((failure: unknown) =>
    logger.error('band: история сна не стёрлась', { failure }),
  );
}
