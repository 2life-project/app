import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

/**
 * Подключён ли браслет. Факт читают три места — «Тело» (что показывать вместо
 * колец), «Устройство» (сам экран) и «Настройки» (список источников), — поэтому
 * он живёт здесь, а не в одной из фич: фича фиче не видна.
 *
 * Это не состояние-менеджер, а один флаг с подпиской: пока фактов столько,
 * заводить под них библиотеку не на чем. Значение переживает перезапуск —
 * иначе снятый браслет возвращается сам, и проверить сценарий нельзя.
 */
const KEY = '2life:band';

let connected = true;
const listeners = new Set<() => void>();

function publish() {
  for (const listener of listeners) listener();
}

void AsyncStorage.getItem(KEY).then((raw) => {
  if (raw === null) return;
  connected = raw === 'true';
  publish();
});

export function setBandConnected(next: boolean): void {
  if (connected === next) return;
  connected = next;
  publish();
  void AsyncStorage.setItem(KEY, String(next));
}

export function useBandConnected(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => connected,
  );
}
