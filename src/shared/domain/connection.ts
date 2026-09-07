import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

/**
 * Какой браслет привязан. Факт читают три места — «Тело» (что показывать
 * вместо колец), «Устройство» (сам экран) и «Настройки» (список источников), —
 * поэтому он живёт здесь, а не в одной из фич: фича фиче не видна.
 *
 * Хранится идентификатор, а не «да/нет»: без него после перезапуска непонятно,
 * к чему подключаться, и привязку пришлось бы проходить заново каждый раз.
 *
 * Идентификатор платформенный, не MAC. iOS не отдаёт адрес устройства — он
 * выдаёт свой UUID, и на другом телефоне тот же браслет будет другим. Поэтому
 * это локальная память телефона, а не общая привязка аккаунта.
 */
export type PairedBand = {
  id: string;
  name: string;
  /** Когда привязали — на экране это «с 4 сентября». */
  pairedAt: string;
};

const KEY = '2life:band';

let paired: PairedBand | null = null;
const listeners = new Set<() => void>();

function publish() {
  for (const listener of listeners) listener();
}

void AsyncStorage.getItem(KEY).then((raw) => {
  if (raw === null) return;
  paired = JSON.parse(raw) as PairedBand;
  publish();
});

export function setPairedBand(next: PairedBand | null): void {
  paired = next;
  publish();
  void (next ? AsyncStorage.setItem(KEY, JSON.stringify(next)) : AsyncStorage.removeItem(KEY));
}

export function usePairedBand(): PairedBand | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => paired,
  );
}

/** Есть ли вообще браслет. Экранам, которым не нужен сам браслет, хватает этого. */
export function useBandConnected(): boolean {
  return usePairedBand() !== null;
}
