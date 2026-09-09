import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * На экране ли приложение прямо сейчас.
 *
 * Нужно связи с браслетом: в фоне система придерживает радио, и опрос там не
 * просто бесполезен — первый же промах уводил соединение в разрыв, и приложение
 * возвращалось уже отключённым. Возврат на экран — повод попробовать снова.
 */
export function useForeground(): boolean {
  const [foreground, setForeground] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) =>
      setForeground(next === 'active'),
    );
    return () => subscription.remove();
  }, []);

  return foreground;
}
