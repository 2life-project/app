import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Обратный отсчёт для действия, которое сервер временно запретил (429).
 * Живёт здесь, а не на экране: экранов, которые упираются в ограничение
 * частоты, будет больше одного, и каждый переписывал бы этот таймер заново.
 *
 * Тик чаще секунды намеренно: считаем от момента окончания по часам, поэтому
 * подвисший JS-поток не растягивает отсчёт, а одинаковые значения всё равно
 * не вызывают перерисовку.
 */
export function useCooldown(): { secondsLeft: number; start: (seconds: number) => void } {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  const start = useCallback(
    (seconds: number) => {
      const until = Date.now() + seconds * 1000;
      stop();
      setSecondsLeft(seconds);
      timer.current = setInterval(() => {
        const left = Math.max(0, Math.ceil((until - Date.now()) / 1000));
        setSecondsLeft(left);
        if (left <= 0) stop();
      }, 250);
    },
    [stop],
  );

  useEffect(() => stop, [stop]);

  return { secondsLeft, start };
}

/**
 * Сколько ждать, когда сервер ответил 429 без `Retry-After`. Значение наше,
 * а не серверное: угадывать нельзя, но и оставлять кнопку живой тоже —
 * следующее нажатие уйдёт в тот же отказ.
 */
export const RATE_LIMIT_SECONDS = 60;
