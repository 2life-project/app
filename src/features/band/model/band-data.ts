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
 * Каждый показатель читается сам по себе и сам по себе доезжает на экран.
 * Одним запросом на всё делать нельзя: у браслета своя очередь команд, любой
 * ответ может не прийти за отведённое время, и на общем `try` один такой
 * промах оставлял бы раздел полностью пустым — хотя остальное устройство
 * отдало.
 *
 * История, сон и стресс идут по одному, а не пачкой: браслет отвечает на них
 * многими кадрами подряд, и одновременные запросы перемешали бы ответы.
 */
export async function loadEverything(
  band: Band,
  patch: (next: Partial<BandState>) => void,
): Promise<void> {
  const now = new Date();
  const week = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  await step('info', async () => {
    const info = await band.info();
    patch({ battery: info.battery?.level, firmware: info.firmware });
  });
  await step('сводка дня', async () => patch({ summary: await band.daySummary() }));
  await step('записи', async () => patch({ recordings: await band.recorder.list() }));
  await step('память', async () =>
    patch({ storage: (await band.recorder.storage()) ?? undefined }),
  );
  await step('сон', async () => patch({ sleep: await band.sleep(week, now) }));
  await step('стресс', async () => patch({ stress: await band.stress(startOfToday(now), now) }));

  patch({ saved: savedRecordings() });

  // История последней: она забирается кадр за кадром и идёт дольше всего
  // остального вместе взятого. Впереди неё числа успели бы устареть.
  await step('история', async () => patch({ today: await band.history(startOfToday(now), now) }));
}

/** Один шаг чтения. Провал одного не отменяет остальные, но виден в логе. */
async function step(what: string, run: () => Promise<void>): Promise<void> {
  try {
    await run();
  } catch (failure) {
    logger.warn('band: не прочиталось', { what, reason: String(failure) });
  }
}
