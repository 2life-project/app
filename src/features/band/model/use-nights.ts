import { useEffect, useMemo, useState } from 'react';

import type { SleepSession } from '../api';

import { loadNights, mergeNights } from './sleep-store';

/**
 * История сна для экрана: ночи с диска плюс то, что устройство отдало сейчас.
 * Свежие ночи показываются сразу, не дожидаясь, пока чтение доедет до диска.
 */
export function useNights(fresh: readonly SleepSession[]): SleepSession[] {
  const [stored, setStored] = useState<SleepSession[]>([]);

  useEffect(() => {
    let alive = true;
    void loadNights().then((nights) => {
      if (alive) setStored(nights);
    });
    return () => {
      alive = false;
    };
  }, [fresh]);

  return useMemo(() => mergeNights(stored, fresh), [stored, fresh]);
}
