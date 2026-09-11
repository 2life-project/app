import { logger } from '@/core/log/logger';

import type { Band } from '../api';
import { holdBand, rememberMark } from '../api';

import { appendSample } from './day-metrics';
import { bandRef, patch, update } from './link-store';
import { applyTick } from './workout-session';
import { saveOpenSession } from './workout-store';

/**
 * Взять браслет под управление: присвоение ссылки вместе с подпиской на его
 * самостоятельные отчёты. Двух отдельных действий здесь быть не должно:
 * присвоить ссылку без подписки — значит оставить устройство, у которого живой
 * замер, метки кнопкой и разрыв уходят в никуда.
 */

/** Раз во сколько секунд занятия сбрасывать его на диск. */
const SAVE_EVERY_SECONDS = 15;

type Hooks = {
  /** Связь оборвалась сама. Решение о переподключении — за вызывающим. */
  onLost: () => void;
  /** Пришло, что стоит показать и отправить: замер, запись, живая минута. */
  onFresh: () => void;
  /** Запись на устройстве закончилась: её пора забрать. */
  onRecordingFinished: () => void;
};

/**
 * Отпустить связь: и по своей воле, и когда её оборвало. Оба пути обязаны идти
 * сюда — иначе флаг «связь занята» остаётся поднятым, и фоновая выгрузка не
 * подключается больше никогда.
 */
export function release(): void {
  bandRef.current = null;
  holdBand(false);
}

export function adopt(next: Band | null, hooks: Hooks): void {
  if (!next) {
    release();
    return;
  }

  bandRef.current = next;
  // Пока связь у приложения, фоновая выгрузка не должна подключаться поверх.
  holdBand(true);

  next.subscribe((event) => {
    // Отчёт от соединения, которое уже отпущено, — эхо старой подписки.
    if (bandRef.current !== next) return;

    if (event.kind === 'activity') {
      // Живой отчёт идёт и в историю: графики дня продолжаются сами, без
      // повторного вычитывания всей истории.
      const sample = event.sample;
      update((current) => ({ live: sample, today: appendSample(current.today, sample) }));
      hooks.onFresh();
    }
    if (event.kind === 'measurement') {
      patch({ measurement: event.measurement });
      hooks.onFresh();
    }
    if (event.kind === 'workout') {
      // Секунда занятия существует только в этом отчёте: переспросить
      // устройство потом будет нечего, оно тренировку не сохраняет.
      update((current) => {
        if (!current.session) return {};
        const session = applyTick(current.session, event.tick);
        // На диск — по ходу, а не только на финише: закрытие приложения
        // иначе стирало бы час пульса молча.
        if (session.seconds % SAVE_EVERY_SECONDS === 0) void saveOpenSession(session);
        return { session };
      });
    }
    if (event.kind === 'wear') patch({ worn: event.worn });
    if (event.kind === 'disconnected') {
      // Данные остаются на экране как последние известные.
      release();
      patch({ stage: 'idle', recording: false });
      hooks.onLost();
    }
    if (event.kind === 'recorder') {
      const recorderEvent = event.event;
      // Метку сохраняем сразу: файл скачается позже, а до тех пор она
      // существует только в этом отчёте.
      if (recorderEvent.kind === 'marked') {
        rememberMark(recorderEvent.session, {
          index: recorderEvent.index,
          offsetSeconds: recorderEvent.offsetSeconds,
        });
        hooks.onFresh();
      }
      if (recorderEvent.kind === 'started') patch({ recording: true });
      if (recorderEvent.kind === 'finished') {
        patch({ recording: false });
        hooks.onRecordingFinished();
      }
    }
  });

  logger.debug('band: связь взята под управление');
}
