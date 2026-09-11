import { currentUser } from '@/core/auth';
import { logger } from '@/core/log/logger';

import { pullRecordings, savedRecordings } from '../api';

import { share } from './link-refresh';
import { bandRef, patch, stateRef } from './link-store';

/** Не качать поверх идущей качки: две выгрузки спорили бы за один файл. */
let collecting = false;

/**
 * Забрать с устройства записи, которых на телефоне ещё нет, и отправить их.
 *
 * По живому соединению, без переподключения и без повторного чтения всего
 * устройства: меняется только список записей, и он приходит из самой качки.
 * Занятие качке не мешает — секундный поток идёт отчётами, а не запросами.
 * Запись, которую устройство пишет сейчас, не трогается.
 */
export async function collectRecordings(): Promise<void> {
  const active = bandRef.current;
  const account = currentUser()?.id;
  if (!active || !account || collecting) return;

  collecting = true;
  try {
    const result = await pullRecordings(active, account, {
      skip: stateRef.current.recordingSession,
    });
    patch({ saved: savedRecordings(), recordings: result.remaining });
    // Скачанное уезжает на сервер вместе с остальным прочитанным.
    if (result.fetched > 0) share();
  } catch (error) {
    // Запись осталась на устройстве и заберётся следующим заходом, но причину
    // надо видеть: место на браслете кончается за пятнадцать часов записи.
    logger.error('band: запись не забралась с браслета', { reason: String(error) });
  } finally {
    collecting = false;
  }
}
