import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import { logger } from '@/core/log/logger';

/**
 * Локальное хранилище состояния макета: отмеченные приёмы, ответы чек-ина,
 * выбранные настройки. Пока сервера нет, это единственное место, где
 * приложение помнит, что человек уже сделал — без него каждый запуск
 * начинается заново, и пройти сценарий целиком нельзя.
 *
 * Читается один раз при появлении экрана, пишется при каждом изменении.
 * Ошибку чтения глушим до значения по умолчанию: сломанная запись не должна
 * ронять экран, а починится она первой же перезаписью.
 */
const PREFIX = '2life:';

export function usePersistentState<T>(key: string, initial: T): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(initial);
  // Пока не прочитали — не пишем: иначе первый рендер затрёт сохранённое.
  const loaded = useRef(false);

  useEffect(() => {
    let alive = true;

    AsyncStorage.getItem(PREFIX + key)
      .then((raw) => {
        if (!alive) return;
        // `loaded` уже true, если человек успел нажать до ответа диска:
        // прочитанное старое значение затёрло бы его выбор.
        if (raw !== null && !loaded.current) setValue(JSON.parse(raw) as T);
        loaded.current = true;
      })
      .catch((error: unknown) => {
        logger.warn('Не прочиталось из хранилища', { key, error });
        loaded.current = true;
      });

    return () => {
      alive = false;
    };
  }, [key]);

  const set = useCallback(
    (next: T) => {
      setValue(next);
      if (!loaded.current) return;
      AsyncStorage.setItem(PREFIX + key, JSON.stringify(next)).catch((error: unknown) =>
        logger.warn('Не записалось в хранилище', { key, error }),
      );
    },
    [key],
  );

  return [value, set];
}

/** Сброс всего, что помнит макет: возврат к состоянию первого запуска. */
export async function clearStore(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  await AsyncStorage.multiRemove(keys.filter((key) => key.startsWith(PREFIX)));
}
