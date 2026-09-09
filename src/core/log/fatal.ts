import { useSyncExternalStore } from 'react';

import { logger, logTrail } from './logger';

/**
 * Фатальная ошибка JS перестаёт убивать приложение.
 *
 * По умолчанию React Native отдаёт такую ошибку своему глобальному обработчику,
 * тот зовёт `RCTFatal`, и процесс снимается сигналом — человек видит не
 * сообщение, а исчезнувшее приложение. Отчёт из TestFlight в этом случае
 * содержит стек native-кода и ни слова о самой ошибке JS.
 *
 * Граница ошибок React сюда не помогает: она ловит только отрисовку. Ошибка из
 * worklet'а Reanimated, из таймера или из колбэка нативного модуля идёт прямо в
 * `ErrorUtils.reportFatalError` и проходит мимо любой границы. Перехват стоит
 * ровно там, где сходятся все три пути.
 */

/**
 * `ErrorUtils` — глобал React Native без публичных типов: он объявлен в
 * полифилах рантайма, а не в пакете. Описываем ровно те два метода, которыми
 * пользуемся, — это честнее, чем приведение к `any`.
 */
type GlobalErrorHandler = (error: unknown, isFatal?: boolean) => void;
type ErrorUtilsShape = {
  getGlobalHandler: () => GlobalErrorHandler;
  setGlobalHandler: (handler: GlobalErrorHandler) => void;
};

/** Ошибка вместе со следом, снятым в момент падения. */
export type FatalReport = { error: Error; trail: readonly string[] };

let fatal: FatalReport | null = null;
const listeners = new Set<() => void>();

function publish(next: FatalReport | null) {
  fatal = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Последнее падение. `null` — приложение живо и рисует себя. */
export function useFatal(): FatalReport | null {
  return useSyncExternalStore(subscribe, () => fatal);
}

/** Забыть ошибку и попробовать нарисовать приложение заново. */
export function clearFatal(): void {
  publish(null);
}

/**
 * Ставится один раз при загрузке модуля: ошибка может прилететь до первого
 * эффекта React, и обработчик, поставленный позже, её уже не увидит.
 */
export function installFatalHandler(): void {
  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsShape }).ErrorUtils;
  if (!errorUtils) return;

  const previous = errorUtils.getGlobalHandler();

  errorUtils.setGlobalHandler((error, isFatal) => {
    // Нефатальное приложение переживает само — это шум, а не остановка.
    //
    // Пустой список подписчиков означает, что экрана ошибки на дереве нет и
    // показать её некому. Проглотить её тогда значит подменить падение с
    // отчётом на сплэш навсегда, поэтому она уходит системе, как и раньше.
    //
    // Вторую и последующие тоже отдаём системе не глядя: настоящая причина —
    // первая, а worklet бросает на каждом кадре и за полсекунды вытеснил бы
    // из следа всё, что было до падения.
    if (!isFatal || listeners.size === 0 || fatal !== null) {
      previous(error, isFatal);
      return;
    }

    try {
      const report = asError(error);
      logger.error('Фатальная ошибка', { name: report.name, message: report.message });
      // Снимок следа: пока экран ошибки висит, в след продолжают падать отмены
      // запросов от размонтированных экранов и вытесняют причину.
      publish({ error: report, trail: [...logTrail()] });
    } catch {
      // Сломался сам перехват — отдаём ошибку системе, как было до нас.
      previous(error, isFatal);
    }
  });
}

function asError(value: unknown): Error {
  if (value instanceof Error) return value;
  return new Error(typeof value === 'string' ? value : JSON.stringify(value));
}
