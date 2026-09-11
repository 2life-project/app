import { useSyncExternalStore, type MutableRefObject } from 'react';

import type { Band } from '../api';

import { INITIAL, type BandState } from './band-state';

/**
 * Состояние связи с браслетом — одно на приложение, вне React.
 *
 * Раньше оно жило в хуке экрана, и уход с экрана рвал соединение: браслет
 * переподключался при каждом возврате, а чтение и отправка начинались заново.
 * Связь принадлежит приложению, экран её только показывает — поэтому хранилище
 * модульное, а экран подписан на него так же, как на привязку и показания.
 */

let state: BandState = INITIAL;
const listeners = new Set<() => void>();

/** Живое соединение. Ссылкой: команды и подписки переживают перерисовку. */
export const bandRef: MutableRefObject<Band | null> = { current: null };

/** Зеркало состояния для обработчиков вне рендера: всегда актуальное. */
export const stateRef: MutableRefObject<BandState> = { current: INITIAL };

function publish(): void {
  stateRef.current = state;
  for (const listener of listeners) listener();
}

export function snapshot(): BandState {
  return state;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useBandState(): BandState {
  return useSyncExternalStore(subscribe, snapshot);
}

export function patch(next: Partial<BandState>): void {
  state = { ...state, ...next };
  publish();
}

/**
 * Правка, считающая новое значение от актуального состояния. Нужна там, где
 * отчёты приходят пачкой: два кадра подряд иначе считались бы от одного и
 * того же старого состояния, и второй затирал бы первый.
 */
export function update(next: (current: BandState) => Partial<BandState>): void {
  patch(next(state));
}

export function reset(): void {
  bandRef.current = null;
  state = INITIAL;
  publish();
}
