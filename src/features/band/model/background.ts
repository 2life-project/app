import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import { currentUser, restoreSession } from '@/core/auth';
import { logger } from '@/core/log/logger';

import { holdsBand, setSyncDevice, syncDevice, syncRecordings } from '../api';

import { uploadRecordings } from './audio-upload';
import { flushOutbox } from './upload';

/**
 * Фоновое окно: забрать записи с устройства и отправить накопленное на сервер.
 *
 * Оба дела в одной задаче намеренно. Система выдаёт окна редко и сама, и делить
 * их между двумя задачами значит соревноваться с собой же за одно и то же
 * время. Порядок такой: сначала устройство — память диктофона кончается за
 * пятнадцать часов записи и ждать не может, — потом сеть.
 *
 * Задача обязана регистрироваться из корня приложения: система будит процесс
 * ради неё, и бандл при этом поднимается без экрана браслета. Пока
 * регистрация жила рядом с экраном, фоновая выгрузка срабатывала только после
 * того, как человек сам открыл раздел, то есть ровно наоборот замыслу.
 */

const TASK = 'band-sync';

TaskManager.defineTask(TASK, async () => {
  // Процесс могла поднять система ради этой задачи — без корня приложения и
  // без сессии. Записи и очередь принадлежат аккаунту, поэтому сначала
  // выясняем, кто вошёл; без ключа на диске делать здесь нечего.
  if (!currentUser()) await restoreSession();

  // Связь держит экран: браслет допускает одно соединение, и подключение
  // поверх оставило бы экран с мёртвым транспортом посреди чтения.
  if (!holdsBand()) await pullFromBand();

  // Отправка идёт в любом случае: очередь наполняется и без фонового окна, а
  // сеть в этот момент как раз есть — система будит процесс, когда она есть.
  await sendToServer();

  return BackgroundTask.BackgroundTaskResult.Success;
});

async function pullFromBand(): Promise<void> {
  const deviceId = await syncDevice();
  if (!deviceId) return;

  try {
    const result = await syncRecordings(deviceId);
    logger.info('band: фоновая выгрузка', { fetched: result.fetched });
  } catch (error) {
    // Браслет вне зоны — обычное дело в фоне. Но сюда же попадают испорченный
    // кадр и отказ прошивки, а место на устройстве кончается за пятнадцать
    // часов записи: прятать это ниже уровня видимости нельзя, а в релизе
    // виден только `error`.
    logger.error('band: фоновая выгрузка не удалась', { reason: String(error) });
  }
}

async function sendToServer(): Promise<void> {
  await flushOutbox();
  await uploadRecordings();
}

/** Включить фоновую работу. Система сама решит, когда будить приложение. */
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
