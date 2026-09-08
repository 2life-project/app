import { useSyncExternalStore } from 'react';

/**
 * Какая ветка диалога открыта. Панель истории — отдельный маршрут, и передать
 * ей обработчик экрана нельзя: выбор живёт здесь, а экран за ним следит.
 *
 * Это не состояние-менеджер, а один факт с подпиской: пока фактов столько,
 * заводить под них библиотеку не на чем.
 */
let chosen: string | null = null;
const listeners = new Set<() => void>();

function publish() {
  for (const listener of listeners) listener();
}

export function openThread(id: string): void {
  if (chosen === id) return;
  chosen = id;
  publish();
}

/** Новая ветка: сервер заведёт её при первом вопросе. */
export function startThread(): void {
  chosen = null;
  publish();
}

export function useChosenThread(): string | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => chosen,
  );
}
