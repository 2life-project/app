import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Band } from '@/core/band';
import { savedRecordings } from '@/core/band';
import { logger } from '@/core/log/logger';

import { startOfToday } from './day-metrics';
import type { BandState } from './use-band';

/**
 * Данные браслета: что читаем с устройства и что храним между запусками.
 *
 * Показания принадлежат телефону и браслету, а не аккаунту: они читаются по
 * Bluetooth, лежат локально и к сессии на сервере отношения не имеют. Поэтому
 * выход из аккаунта их не трогает — иначе раздел каждый раз начинался бы с
 * пустых графиков, хотя браслет всё это время писал.
 */
const KEY = '2life:band-snapshot';

/** Что переживает перезапуск. Остальное — состояние соединения, оно всегда новое. */
type Snapshot = Pick<
  BandState,
  | 'battery'
  | 'firmware'
  | 'live'
  | 'summary'
  | 'measurement'
  | 'worn'
  | 'sleep'
  | 'today'
  | 'stress'
  | 'recordings'
  | 'storage'
>;

const KEEP: readonly (keyof Snapshot)[] = [
  'battery',
  'firmware',
  'live',
  'summary',
  'measurement',
  'worn',
  'sleep',
  'today',
  'stress',
  'recordings',
  'storage',
];

const ISO = /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/;

/** JSON не знает дат: без восстановления время замера приезжает строкой. */
function revive(_key: string, value: unknown): unknown {
  return typeof value === 'string' && ISO.test(value) ? new Date(value) : value;
}

export async function loadSnapshot(): Promise<Snapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw === null ? null : (JSON.parse(raw, revive) as Snapshot);
  } catch (failure) {
    logger.warn('band: сохранённые данные не прочитались', { failure });
    return null;
  }
}

export function saveSnapshot(state: BandState): void {
  const snapshot = Object.fromEntries(KEEP.map((key) => [key, state[key]])) as unknown as Snapshot;

  void AsyncStorage.setItem(KEY, JSON.stringify(snapshot)).catch((failure: unknown) =>
    logger.warn('band: данные не сохранились', { failure }),
  );
}

export function clearSnapshot(): void {
  void AsyncStorage.removeItem(KEY).catch(() => undefined);
}

/**
 * Прочитать с устройства всё, что показывает раздел.
 *
 * История, сон и стресс идут по одному, а не пачкой: браслет отвечает на них
 * многими кадрами подряд, и одновременные запросы перемешали бы ответы.
 */
export async function readEverything(band: Band): Promise<Partial<BandState>> {
  const [info, summary, recordings, storage] = await Promise.all([
    band.info(),
    band.daySummary(),
    band.recordings(),
    band.storage(),
  ]);

  const now = new Date();
  const week = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  return {
    battery: info.battery?.level,
    firmware: info.firmware,
    summary,
    recordings,
    storage: storage ?? undefined,
    sleep: await band.sleep(week, now),
    today: await band.history(startOfToday(now), now),
    stress: await band.stress(startOfToday(now), now),
    saved: savedRecordings(),
  };
}
