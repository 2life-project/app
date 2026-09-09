import { type MutableRefObject, useCallback } from 'react';

import type { Band } from '../api';
import { holdBand, rememberMark } from '../api';

import { appendSample } from './day-metrics';
import type { BandState } from './use-band';
import { applyTick } from './workout-session';

type Options = {
  bandRef: MutableRefObject<Band | null>;
  /** Зеркало состояния: обработчик живёт вне рендера и текущего state не видит. */
  latest: MutableRefObject<BandState>;
  patch: (next: Partial<BandState>) => void;
  refresh: () => Promise<void>;
};

/**
 * Взять браслет под управление: присвоение ссылки вместе с подпиской на его
 * самостоятельные отчёты.
 *
 * Двух отдельных действий здесь быть не должно. Присвоить ссылку без подписки —
 * значит оставить устройство на связи, у которого живой замер, метки кнопкой и
 * разрыв уходят в никуда: экран продолжает считать себя подключённым, а данные
 * не идут. Один вход на оба действия, чтобы забыть подписку было негде.
 */
export function useBandEvents({ bandRef, latest, patch, refresh }: Options) {
  return useCallback(
    (next: Band | null) => {
      bandRef.current = next;
      // Пока связь у экрана, фоновая выгрузка не должна подключаться поверх.
      holdBand(next !== null);
      if (!next) return;

      next.subscribe((event) => {
        if (event.kind === 'activity') {
          // Живой отчёт идёт и в историю: пока приложение открыто, графики
          // дня продолжаются сами, без повторного вычитывания всей истории.
          const sample = event.sample;
          patch({ live: sample, today: appendSample(latest.current.today, sample) });
        }
        if (event.kind === 'measurement') patch({ measurement: event.measurement });
        if (event.kind === 'workout') {
          // Секунда занятия существует только в этом отчёте: переспросить
          // устройство потом будет нечего, оно тренировку не сохраняет.
          const current = latest.current.session;
          if (current) patch({ session: applyTick(current, event.tick) });
        }
        if (event.kind === 'wear') patch({ worn: event.worn });
        if (event.kind === 'disconnected') {
          // Связь оборвалась: держать живой браслет в руках больше нельзя, а
          // данные остаются на экране как последние известные.
          bandRef.current = null;
          patch({ stage: 'idle', recording: false });
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
          }
          if (recorderEvent.kind === 'started') patch({ recording: true });
          if (recorderEvent.kind === 'finished') {
            patch({ recording: false });
            void refresh();
          }
        }
      });
    },
    [bandRef, latest, patch, refresh],
  );
}
