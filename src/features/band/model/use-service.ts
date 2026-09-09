import { useCallback, useState, type MutableRefObject } from 'react';

import { logger } from '@/core/log/logger';

import type { Band } from '../api';

/**
 * Служебные команды устройства.
 *
 * Отдельно от остальных намеренно: три из четырёх необратимы, и ни одна не
 * спрашивает подтверждения на самом браслете — экрана у него нет. Всё, что
 * стоит между человеком и стёртой историей, находится в приложении.
 */

/** Что именно сделали: экран показывает подтверждение словами команды. */
export type ServiceAction = 'erase' | 'reset' | 'repair';

export type Service = {
  busy: boolean;
  done: ServiceAction | null;
  problem: ServiceAction | null;
  run: (action: ServiceAction) => Promise<void>;
  dismiss: () => void;
};

export function useService(bandRef: MutableRefObject<Band | null>): Service {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<ServiceAction | null>(null);
  const [problem, setProblem] = useState<ServiceAction | null>(null);

  const run = useCallback(
    async (action: ServiceAction) => {
      const band = bandRef.current;
      if (!band) return;

      setBusy(true);
      setDone(null);
      setProblem(null);

      try {
        if (action === 'erase') await band.admin.eraseRecordings();
        if (action === 'reset') await band.admin.factoryReset();
        if (action === 'repair') await band.admin.requestPairing();
        setDone(action);
      } catch (failure) {
        // Сказать обязательно: молчание после «стереть всё» человек прочитает
        // как «стёрлось», а записи останутся на устройстве.
        logger.warn('band: служебная команда не прошла', { action, reason: String(failure) });
        setProblem(action);
      } finally {
        setBusy(false);
      }
    },
    [bandRef],
  );

  const dismiss = useCallback(() => {
    setDone(null);
    setProblem(null);
  }, []);

  return { busy, done, problem, run, dismiss };
}
