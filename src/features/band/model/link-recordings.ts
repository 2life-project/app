import { currentUser } from '@/core/auth';
import { logger } from '@/core/log/logger';

import { pullRecordings, savedRecordings } from '../api';

import { refresh } from './link-refresh';
import { bandRef, patch, stateRef } from './link-store';

/** Не качать поверх идущей качки: две выгрузки спорили бы за один файл. */
let collecting = false;

/**
 * Забрать с устройства записи, которых на телефоне ещё нет, и отправить их.
 *
 * По живому соединению, без переподключения: браслет держит одну связь, и
 * рвать её ради качки значило бы терять живые отчёты на всё её время. Во
 * время занятия не качаем — секундный поток застыл бы до самого финиша.
 */
export async function collectRecordings(): Promise<void> {
  const active = bandRef.current;
  const account = currentUser()?.id;
  if (!active || !account || collecting || stateRef.current.session) return;

  collecting = true;
  try {
    await pullRecordings(active, account);
    patch({ saved: savedRecordings() });
    // Перечитать устройство: список записей на нём изменился, а отправка
    // скачанного на сервер — часть общей отправки прочитанного.
    await refresh();
  } catch (error) {
    // Запись осталась на устройстве и заберётся следующим заходом, но причину
    // надо видеть: место на браслете кончается за пятнадцать часов записи.
    logger.error('band: запись не забралась с браслета', { reason: String(error) });
  } finally {
    collecting = false;
  }
}
