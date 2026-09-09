import { useSyncExternalStore } from 'react';

import { logger } from './logger';

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

let fatal: Error | null = null;
const listeners = new Set<() => void>();

function publish(next: Error | null) {
  fatal = next;
  for (const listener of listeners) listener();
}

/** Последняя фатальная ошибка. `null` — приложение живо и рисует себя. */
export function useFatal(): Error | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => fatal,
  );
}

/** Забыть ошибку и попробовать нарисовать приложение заново. */
export function clearFatal(): void {
  publish(null);
}

/** Ошибка, пойманная границей отрисовки: тот же экран, тот же след. */
export function reportFatal(error: Error): void {
  logger.error('Фатальная ошибка', { name: error.name, message: error.message });
  publish(error);
}

function asError(value: unknown): Error {
  if (value instanceof Error) return value;
  return new Error(typeof value === 'string' ? value : JSON.stringify(value));
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
    if (!isFatal) {
      previous(error, isFatal);
      return;
    }
    try {
      reportFatal(asError(error));
    } catch {
      // Сломался сам перехват — отдаём ошибку системе, как было до нас.
      previous(error, isFatal);
    }
  });
}
