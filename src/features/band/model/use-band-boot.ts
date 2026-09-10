import { useEffect, type MutableRefObject } from 'react';

import { logger } from '@/core/log/logger';
import type { PairedBand } from '@/shared/domain';

import type { Band } from '../api';
import { connectedBands, sortByProximity } from '../api';

import { loadSnapshot } from './band-data';
import { INITIAL, type BandState } from './band-state';
import { publishReadings } from './publish-readings';

/**
 * Что раздел делает сам, без участия человека: поднимает прошлые показания,
 * находит уже подключённый браслет и держит сводку дня свежей. Вынесено из
 * состояния раздела, чтобы то отвечало за связь и команды, а не за всё разом.
 */

/** Как часто обновлять сводку дня при открытом разделе. */
const LIVE_POLL_MS = 30_000;

export function useBandBoot(
  paired: PairedBand | null,
  patch: (next: Partial<BandState>) => void,
): void {
  // Показания с прошлого запуска — сразу, не дожидаясь Bluetooth. Они лежат на
  // диске телефона и от сессии в аккаунте не зависят: раздел не должен
  // начинаться с пустых графиков только потому, что связь ещё не поднялась.
  useEffect(() => {
    loadSnapshot()
      .then((snapshot) => {
        if (!snapshot) return;
        patch(snapshot);
        // Публикуем сам снимок, а не зеркало состояния: зеркало обновляется
        // внутри `setState`, то есть уже после этой микрозадачи, и здесь оно
        // ещё пустое — на Главную уезжали бы пустые показания поверх настоящих.
        publishReadings({ ...INITIAL, ...snapshot });
      })
      .catch((failure: unknown) => logger.error('band: снимок не поднялся', { failure }));
  }, [patch]);

  // Браслет мог остаться на связи с телефоном — от прошлого запуска, от
  // системы, от приложения вендора. В эфире такого не найти: подключённое
  // устройство перестаёт рекламировать себя, и поиск молчал бы вечно.
  useEffect(() => {
    if (paired) return;
    connectedBands()
      .then((bands) => {
        if (bands.length > 0) patch({ found: sortByProximity(bands) });
      })
      .catch((failure: unknown) => logger.error('band: список связей не прочитался', { failure }));
  }, [paired, patch]);
}

/**
 * Пока раздел открыт, сводка дня подтягивается сама: шаги и калории живой
 * отчёт не несёт, а смотреть на цифры получасовой давности при подключённом
 * браслете незачем.
 */
export function useLivePoll({
  stage,
  foreground,
  bandRef,
  adopt,
  patch,
}: {
  stage: BandState['stage'];
  foreground: boolean;
  bandRef: MutableRefObject<Band | null>;
  adopt: (next: Band | null) => void;
  patch: (next: Partial<BandState>) => void;
}): void {
  useEffect(() => {
    // В фоне опрос бессмысленен: система придерживает радио, а первый же промах
    // уводил связь в 'idle' — приложение возвращалось уже отключённым.
    if (stage !== 'connected' || !foreground) return;

    const timer = setInterval(() => {
      void bandRef.current
        ?.daySummary()
        .then((summary) => patch({ summary }))
        .catch((failure: unknown) => {
          // Сама по себе связь не восстановится, а опрос будет ходить в неё до
          // ухода с экрана — по строке в лог каждые полминуты, пока человек
          // смотрит на «подключено», которого нет.
          logger.error('band: связь потеряна на опросе', { reason: String(failure) });
          // Закрыть соединение обязательно: без этого подписки и открытый
          // канал остаются висеть, а браслет считает себя занятым и в эфире
          // больше не появляется.
          void bandRef.current
            ?.disconnect()
            .catch((reason: unknown) => logger.warn('band: связь не закрылась', { reason }));
          adopt(null);
          patch({ stage: 'idle' });
        });
    }, LIVE_POLL_MS);

    return () => clearInterval(timer);
  }, [adopt, bandRef, foreground, patch, stage]);
}
