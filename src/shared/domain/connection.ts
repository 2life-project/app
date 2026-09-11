import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { logger } from '@/core/log/logger';

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

/**
 * Первое чтение с диска. Оно догоняет уже сделанную запись: если человек успел
 * привязать браслет до того, как диск ответил, старое значение затирать
 * нельзя. Битую запись игнорируем — иначе она роняет модуль на каждом старте.
 */
let touched = false;

void AsyncStorage.getItem(KEY)
  .then((raw) => {
    if (touched || raw === null) return;
    paired = JSON.parse(raw) as PairedBand;
    publish();
  })
  .catch((failure: unknown) => logger.error('Привязка браслета не прочиталась', { failure }));

export function setPairedBand(next: PairedBand | null): void {
  touched = true;
  paired = next;
  publish();
  void (next ? AsyncStorage.setItem(KEY, JSON.stringify(next)) : AsyncStorage.removeItem(KEY));
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePairedBand(): PairedBand | null {
  return useSyncExternalStore(subscribe, () => paired);
}

/**
 * Привязка вне React. Нужна связи с браслетом: она живёт на уровне
 * приложения, а не экрана, и поднимается при старте — до того, как хоть один
 * компонент отрисован.
 */
export function pairedBand(): PairedBand | null {
  return paired;
}

export function onPairedBand(listener: () => void): () => void {
  return subscribe(listener);
}

/**
 * Привязан ли браслет к телефону. Это не «на связи»: связь рвётся и
 * восстанавливается сама, а привязка живёт до тех пор, пока её не сняли.
 */
export function useBandPaired(): boolean {
  return usePairedBand() !== null;
}
