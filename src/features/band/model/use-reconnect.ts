import { useEffect, type MutableRefObject } from 'react';

import type { PairedBand } from '@/shared/domain';

import type { BandStage, BandState } from './band-state';

/**
 * Возвращение связи после обрыва.
 *
 * Связь с браслетом рвётся сама: он уходит из зоны, засыпает, отдаёт себя
 * другому телефону. Раньше попытка была ровно одна на запуск, и после первого
 * же обрыва раздел оставался мёртвым до тех пор, пока приложение не свернут и
 * не развернут обратно. Человек при этом видел последние прочитанные цифры и
 * не знал, что они больше не обновляются.
 *
 * Пауза растёт с каждой попыткой: браслет вне зоны или занятый чужим телефоном
 * не появится оттого, что мы стучимся чаще, а радио и заряд тратятся на каждой.
 */

/**
 * Паузы перед попытками. Первая почти сразу — обрыв чаще всего мгновенный и
 * связь поднимается с первого раза; дальше реже.
 */
const RETRY_DELAYS_MS = [1_000, 5_000, 15_000, 30_000, 60_000] as const;

type Options = {
  paired: PairedBand | null;
  stage: BandStage;
  /** Приложение на экране. В фоне система придерживает радио. */
  foreground: boolean;
  /** Какая по счёту попытка идёт. Сбрасывается удачной связью. */
  attempt: MutableRefObject<number>;
  /** Человек отключился сам — тогда обратно его не тащим. */
  manual: MutableRefObject<boolean>;
  patch: (next: Partial<BandState>) => void;
  connect: (device: { id: string; name: string; rssi: number }) => Promise<void>;
};

export function useReconnect({
  paired,
  stage,
  foreground,
  attempt,
  manual,
  patch,
  connect,
}: Options): void {
  useEffect(() => {
    if (!paired || manual.current) return;
    // В фоне попытка всё равно не пройдёт, а счётчик она израсходует.
    if (!foreground) return;
    if (stage === 'connected' || stage === 'connecting' || stage === 'scanning') return;

    const wait = RETRY_DELAYS_MS[Math.min(attempt.current, RETRY_DELAYS_MS.length - 1)] ?? 0;
    patch({ retrying: attempt.current > 0 });

    const timer = setTimeout(() => {
      attempt.current += 1;
      void connect({ id: paired.id, name: paired.name, rssi: 0 });
    }, wait);

    return () => clearTimeout(timer);
  }, [attempt, connect, foreground, manual, paired, patch, stage]);
}
