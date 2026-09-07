import { useCallback, useEffect, useRef, useState } from 'react';

import { HttpError } from './client';

/**
 * Минимальный клиент серверного состояния. Заведён по триггеру из
 * `docs/decisions.md`: как только экран показывает список с сервера, четыре
 * его состояния — загрузка, ошибка, пусто, данные — начинают писаться руками
 * и каждый раз по-разному.
 *
 * Кэша между экранами здесь нет и не задумано: он потребует инвалидации, а
 * пока каждый экран забирает своё при появлении. Появится вторая точка, где
 * тот же ответ нужен без повторного запроса, — это станет отдельной задачей.
 */
export type Query<T> = {
  data: T | null;
  error: unknown;
  /** Первая загрузка: показывать нечего. */
  loading: boolean;
  /** Обновление поверх уже показанных данных — для «потянуть вниз». */
  refreshing: boolean;
  refresh: () => void;
};

/** Ответ 401 — это не «сломалось», а «нет доступа»: экран говорит другое. */
export function isUnauthorized(error: unknown): boolean {
  return error instanceof HttpError && error.status === 401;
}

type Settled<T> = { key: string; attempt: number; data: T | null; error: unknown };

/**
 * `key` — единственная зависимость: строка, которая полностью определяет
 * запрос (путь с параметрами). Так вызывающему не нужно помнить про
 * `useCallback`, а забытая мемоизация не превращается в цикл запросов.
 *
 * `null` вместо ключа означает «пока не нужно»: запрос не уходит, состояние
 * остаётся пустым. Так содержимое панели грузится, когда её открыли, а не
 * когда отрисовали закрытой.
 */
export function useQuery<T>(
  key: string | null,
  load: (signal: AbortSignal) => Promise<T>,
): Query<T> {
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Запрос описывается ключом, а функция читается свежая: держать её в
  // зависимостях значит перезапускать загрузку на каждый рендер родителя.
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    if (key === null) return;
    const controller = new AbortController();

    loadRef
      .current(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setSettled({ key, attempt, data, error: null });
      })
      .catch((error: unknown) => {
        // Отмена — это уход с экрана, а не сбой: показывать по ней ошибку
        // значит мигать красным на каждом переходе.
        if (!controller.signal.aborted) setSettled({ key, attempt, data: null, error });
      });

    return () => controller.abort();
  }, [key, attempt]);

  const refresh = useCallback(() => setAttempt((value) => value + 1), []);

  // Состояние выводится из того, что уже осело, а не выставляется в эффекте:
  // смена ключа сама по себе означает «данных для него ещё нет».
  const forKey = settled?.key === key ? settled : null;
  const done = forKey !== null && forKey.attempt === attempt;
  const data = forKey?.data ?? null;

  return {
    data,
    error: done ? forKey.error : null,
    loading: key !== null && !done && data === null,
    refreshing: !done && data !== null,
    refresh,
  };
}
