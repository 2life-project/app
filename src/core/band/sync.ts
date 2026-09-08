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
    const fresh = (await band.recordings()).filter((item) => !known.has(item.session));

    let fetched = 0;
    let freed = 0;

    for (const recording of fresh.slice(0, RECORDINGS_PER_RUN)) {
      const raw = await band.downloadRecording(recording.session, recording.bytes);

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

      await band.removeRecording(recording.session);
      freed += recording.bytes;
    }

    return { fetched, freed };
  } finally {
    await band.disconnect();
  }
}

/**
 * Идентификатор устройства для фоновой задачи. Задача просыпается вне экранов,
 * своего состояния у неё нет, поэтому адрес хранится здесь.
 */
let pairedDeviceId: string | null = null;

export function setSyncDevice(deviceId: string | null): void {
  pairedDeviceId = deviceId;
}

TaskManager.defineTask(TASK, async () => {
  if (!pairedDeviceId) return BackgroundTask.BackgroundTaskResult.Success;

  try {
    const result = await syncRecordings(pairedDeviceId);
    logger.info('band: фоновая выгрузка', { fetched: result.fetched });
  } catch (error) {
    // Браслет мог быть вне зоны или занят телефоном — это обычное дело в фоне,
    // а не сбой: следующее окно попробует снова.
    logger.debug('band: фоновая выгрузка не удалась', { reason: String(error) });
  }

  return BackgroundTask.BackgroundTaskResult.Success;
});

/** Включить фоновую выгрузку. Система сама решит, когда будить приложение. */
export async function startBackgroundSync(deviceId: string): Promise<void> {
  setSyncDevice(deviceId);

  if (await TaskManager.isTaskRegisteredAsync(TASK)) return;
  await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: 15 });
}

export async function stopBackgroundSync(): Promise<void> {
  setSyncDevice(null);

  if (!(await TaskManager.isTaskRegisteredAsync(TASK))) return;
  await BackgroundTask.unregisterTaskAsync(TASK);
}
