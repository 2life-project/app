import { AppState } from 'react-native';

import { logger } from '@/core/log/logger';

import { uploadRecordings } from './audio-upload';
import { loadEverything, loadHistory, saveSnapshot } from './band-data';
import { bandRef, patch, stateRef } from './link-store';
import { publishReadings } from './publish-readings';
import { publishToServer } from './upload';

/**
 * Что делать с прочитанным и когда читать.
 *
 * Отдельно от жизненного цикла связи: здесь только «прочитал → показал →
 * отправил», без знания о том, как соединение поднимается и рвётся.
 */

/** Приложение на экране. В фоне длинные чтения не начинаем: система даёт секунды. */
let foreground = AppState.currentState === 'active';

export function setForeground(next: boolean): void {
  foreground = next;
}

export function isForeground(): boolean {
  return foreground;
}

/**
 * Показать разделу, отдать остальному приложению, отправить на сервер.
 * Отправка — без ожидания: она ходит в сеть, а этот путь стоит на подключении.
 */
export function share(): void {
  saveSnapshot(stateRef.current);
  // Итоги дня — остальному приложению. Здесь, а не на каждом живом отчёте:
  // отчёты приходят каждые десять секунд, а минутные итоги между ними те же.
  publishReadings(stateRef.current);
  // Отказ отправки обязан быть виден: молча оборванное обещание — это очередь,
  // которая «не работает» без единой строки в логе.
  publishToServer(stateRef.current).catch((failure: unknown) =>
    logger.error('band: отправка сорвалась', { reason: String(failure) }),
  );
  uploadRecordings().catch((failure: unknown) =>
    logger.error('band: выгрузка записей сорвалась', { reason: String(failure) }),
  );
}

/**
 * Как часто пуши браслета уезжают на сервер сами по себе. Живой отчёт
 * приходит каждые десять секунд — гонять сеть на каждый значит жечь заряд в
 * фоне впустую; минута — и на сервере всегда свежие показания.
 */
const SHARE_THROTTLE_MS = 60_000;

let shareTimer: ReturnType<typeof setTimeout> | null = null;

/** Отправить накопившееся, но не чаще раза в минуту. */
export function shareSoon(): void {
  if (shareTimer) return;
  shareTimer = setTimeout(() => {
    shareTimer = null;
    share();
  }, SHARE_THROTTLE_MS);
}

/**
 * Обновить всё, что читается. Вызывается после подключения и по кнопке.
 *
 * В два приёма: быстрые чтения уезжают на сервер сразу, а история — когда
 * дочитается. Она идёт кадр за кадром минуты, и ждать её значило бы, что
 * после подключения на сервере долго нет ничего. В фоне историю не читаем:
 * система будит приложение на секунды ради пуша, а не ради тысячи кадров.
 */
export async function refresh(): Promise<void> {
  const active = bandRef.current;
  if (!active) return;

  patch({ busy: true });
  try {
    await loadEverything(active, patch);
    share();
    if (foreground) {
      await loadHistory(active, patch);
      share();
    }
  } finally {
    patch({ busy: false });
  }
}
