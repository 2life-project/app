import AsyncStorage from '@react-native-async-storage/async-storage';

import { currentUser } from '@/core/auth';
import { logger } from '@/core/log/logger';

import { Band } from './band';
import { saveRecording, savedSessions } from './storage';

/**
 * Выгрузка записей с браслета на телефон.
 *
 * Идёт и с экрана, и из фоновой задачи, а та получает короткие окна и решает
 * их выдачу сама. Поэтому выгрузка устроена так, чтобы её можно было прервать
 * в любой момент без потерь: за один заход забирается одна запись, и только
 * полностью скачанная удаляется с устройства.
 *
 * Место на браслете кончается примерно через пятнадцать часов записи, так что
 * своевременная выгрузка — не оптимизация, а условие работы диктофона.
 *
 * Саму фоновую задачу заводит `model/background.ts`: в окне системы надо не
 * только забрать файлы с устройства, но и отправить накопленное на сервер, а
 * это уже не дело драйвера.
 */

/** Одна запись за окно: длинная выгрузка всё равно не успеет и начнётся заново. */
const RECORDINGS_PER_RUN = 1;

type SyncResult = { fetched: number; freed: number };

/**
 * Забрать новые записи. Вызывается и из фоновой задачи, и с экрана — при
 * открытии приложения система окна не выдаёт, а забрать надо.
 */
export async function syncRecordings(deviceId: string): Promise<SyncResult> {
  // Записи принадлежат аккаунту, и без него им нет места на телефоне. Забрать
  // файл с устройства и стереть его там — значило бы потерять запись совсем.
  // Аккаунт запоминается здесь, до качки: она долгая, а файл обязан лечь в
  // папку того, для кого его забирали.
  const account = currentUser()?.sub;
  if (!account) return { fetched: 0, freed: 0 };

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

      saveRecording(recording.session, raw, account);
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

/**
 * Держит ли связь экран. Браслет допускает одно соединение, и фоновая задача,
 * подключившись поверх, в своём `finally` закрыла бы чужое: экран остался бы с
 * мёртвым транспортом посреди чтения.
 */
let held = false;

export function holdBand(on: boolean): void {
  held = on;
}

export function holdsBand(): boolean {
  return held;
}

/** Какой браслет выгружать в фоне. Читается уже после перезапуска процесса. */
export async function syncDevice(): Promise<string | null> {
  return pairedDeviceId ?? (await AsyncStorage.getItem(DEVICE_KEY));
}
