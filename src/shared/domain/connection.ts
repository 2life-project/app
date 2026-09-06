import { useSyncExternalStore } from 'react';

/**
 * Подключён ли браслет. Факт читают три места — «Тело» (что показывать вместо
 * колец), «Устройство» (сам экран) и «Настройки» (список источников), — поэтому
 * он живёт здесь, а не в одной из фич: фича фиче не видна.
 *
 * Это не состояние-менеджер, а один флаг с подпиской: пока фактов столько,
 * заводить под них библиотеку не на чем.
 */
let connected = true;
const listeners = new Set<() => void>();

export function setBandConnected(next: boolean): void {
  if (connected === next) return;
  connected = next;
  for (const listener of listeners) listener();
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
