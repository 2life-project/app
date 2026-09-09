import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import { logger } from '@/core/log/logger';

import { Band } from './band';
import { saveRecording, savedSessions } from './storage';

/**
 * Фоновая выгрузка записей с браслета.
 *
 * Система даёт короткие окна и решает сама, когда их выдать. Поэтому задача
 * устроена так, чтобы её можно было прервать в любой момент без потерь: за один
 * запуск забирается одна запись, и только полностью скачанная удаляется с
 * устройства.
 *
 * Место на браслете кончается примерно через пятнадцать часов записи, так что
 * своевременная выгрузка — не оптимизация, а условие работы диктофона.
 */

const TASK = 'band-sync';

/** Одна запись за окно: длинная выгрузка всё равно не успеет и начнётся заново. */
const RECORDINGS_PER_RUN = 1;

type SyncResult = { fetched: number; freed: number };

/**
 * Забрать новые записи. Вызывается и из фоновой задачи, и с экрана — при
 * открытии приложения система окна не выдаёт, а забрать надо.
 */
export async function syncRecordings(deviceId: string): Promise<SyncResult> {
  const band = await Band.connect(deviceId);

  try {
    const known = savedSessions();
    const fresh = (await band.recorder.list()).filter((item) => !known.has(item.session));

    let fetched = 0;
    let freed = 0;

    for (const recording of fresh.slice(0, RECORDINGS_PER_RUN)) {
      const raw = await band.recorder.download(recording.session, recording.bytes);

      // Скачали не всё — на устройстве не трогаем: остаток дозагрузится
      // в следующее окно, а неполный файл потом не восстановить.
      if (raw.length < recording.bytes) {
        logger.warn('band: запись пришла не целиком', {
          session: recording.session,
          got: raw.length,
          expected: recording.bytes,
        });
        continue;
      }

      saveRecording(recording.session, raw);
      fetched += 1;

      await band.recorder.remove(recording.session);
      freed += recording.bytes;
    }

    return { fetched, freed };
  } finally {
    await band.disconnect();
  }
}

/**
 * Идентификатор устройства для фоновой задачи.
 *
 * В памяти его держать мало: систему интересно будить как раз тогда, когда
 * приложение убито, а при этом модуль загружается заново и переменная пуста —
 * фоновая выгрузка тихо не работала бы ни разу до следующего открытия экрана.
 */
const DEVICE_KEY = '2life:band-sync-device';

let pairedDeviceId: string | null = null;

export async function setSyncDevice(deviceId: string | null): Promise<void> {
  pairedDeviceId = deviceId;
  await (
    deviceId ? AsyncStorage.setItem(DEVICE_KEY, deviceId) : AsyncStorage.removeItem(DEVICE_KEY)
  ).catch((failure: unknown) => logger.warn('band: адрес для фона не сохранился', { failure }));
}

async function syncDevice(): Promise<string | null> {
  return pairedDeviceId ?? (await AsyncStorage.getItem(DEVICE_KEY));
}

/**
 * Держит ли связь экран. Браслет допускает одно соединение, и фоновая задача,
 * подключившись поверх, в своём `finally` закрыла бы чужое: экран остался бы с
 * мёртвым транспортом посреди чтения.
 */
let held = false;

export function holdBand(on: boolean): void {
  held = on;
}

TaskManager.defineTask(TASK, async () => {
  if (held) return BackgroundTask.BackgroundTaskResult.Success;

  const deviceId = await syncDevice();
  if (!deviceId) return BackgroundTask.BackgroundTaskResult.Success;

  try {
    const result = await syncRecordings(deviceId);
    logger.info('band: фоновая выгрузка', { fetched: result.fetched });
  } catch (error) {
    // Браслет вне зоны — обычное дело в фоне. Но сюда же попадают испорченный
    // кадр и отказ прошивки, а место на устройстве кончается за пятнадцать
    // часов записи: прятать это ниже уровня видимости нельзя.
    logger.warn('band: фоновая выгрузка не удалась', { reason: String(error) });
  }

  return BackgroundTask.BackgroundTaskResult.Success;
});

/** Включить фоновую выгрузку. Система сама решит, когда будить приложение. */
export async function startBackgroundSync(deviceId: string): Promise<void> {
  await setSyncDevice(deviceId);

  if (await TaskManager.isTaskRegisteredAsync(TASK)) return;
  await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: 15 });
}

export async function stopBackgroundSync(): Promise<void> {
  await setSyncDevice(null);

  if (!(await TaskManager.isTaskRegisteredAsync(TASK))) return;
  await BackgroundTask.unregisterTaskAsync(TASK);
}
