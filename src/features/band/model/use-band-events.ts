import { type MutableRefObject, useCallback } from 'react';

import type { Band } from '../api';
import { holdBand, rememberMark } from '../api';

import type { BandState } from './band-state';
import { appendSample } from './day-metrics';
import { applyTick } from './workout-session';

type Options = {
  bandRef: MutableRefObject<Band | null>;
  patch: (next: Partial<BandState>) => void;
  /** Правка от актуального состояния: тики приходят пачками. */
  update: (next: (current: BandState) => Partial<BandState>) => void;
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
export function useBandEvents({ bandRef, patch, update, refresh }: Options) {
  /**
   * Отпустить связь: и по своей воле, и когда её оборвало.
   *
   * Оба пути обязаны идти сюда. Прямое присваивание ссылки оставляло флаг
   * «связь занята экраном» поднятым навсегда, и фоновая выгрузка после первого
   * же обрыва не срабатывала больше никогда.
   */
  const release = useCallback(() => {
    bandRef.current = null;
    holdBand(false);
  }, [bandRef]);

  const adopt = useCallback(
    (next: Band | null) => {
      if (!next) {
        release();
        return;
      }

      bandRef.current = next;
      // Пока связь у экрана, фоновая выгрузка не должна подключаться поверх.
      holdBand(true);

      next.subscribe((event) => {
        if (event.kind === 'activity') {
          // Живой отчёт идёт и в историю: пока приложение открыто, графики
          // дня продолжаются сами, без повторного вычитывания всей истории.
          const sample = event.sample;
          update((current) => ({ live: sample, today: appendSample(current.today, sample) }));
        }
        if (event.kind === 'measurement') patch({ measurement: event.measurement });
        if (event.kind === 'workout') {
          // Секунда занятия существует только в этом отчёте: переспросить
          // устройство потом будет нечего, оно тренировку не сохраняет.
          update((current) =>
            current.session ? { session: applyTick(current.session, event.tick) } : {},
          );
        }
        if (event.kind === 'wear') patch({ worn: event.worn });
        if (event.kind === 'disconnected') {
          // Связь оборвалась: держать живой браслет в руках больше нельзя, а
          // данные остаются на экране как последние известные.
          //
          // Отпускаем через тот же вход, что и берём: прямое присваивание
          // ссылки оставляло фоновую выгрузку заблокированной навсегда —
          // флаг «связь занята экраном» так и не снимался.
          release();
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
    [bandRef, patch, release, update, refresh],
  );

  return adopt;
}
