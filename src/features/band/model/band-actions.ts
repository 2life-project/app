import { useCallback, type MutableRefObject } from 'react';

import { Band, savedRecordings, syncRecordings } from '@/core/band';
import { logger } from '@/core/log/logger';

import type { BandState } from './use-band';

/** Сколько вибрировать по кнопке «найти»: дальше человек и так услышал. */
const BUZZ_MS = 3000;

type Options = {
  /** Живое соединение. Ссылкой, а не значением: команды переживают перерисовку. */
  bandRef: MutableRefObject<Band | null>;
  patch: (next: Partial<BandState>) => void;
  refresh: () => Promise<void>;
  deviceId?: string;
};

/**
 * Команды браслету: то, что человек нажимает, а не то, что читается само.
 *
 * Вынесены из состояния намеренно — состояние отвечает за связь и данные, а
 * здесь только действия, и каждое из них тихо ничего не делает, если связи нет.
 */
export function useBandActions({ bandRef, patch, refresh, deviceId }: Options) {
  const withBand = useCallback(
    (action: (active: Band) => Promise<void>) => async () => {
      const active = bandRef.current;
      if (!active) return;

      try {
        await action(active);
      } catch (error) {
        logger.warn('band: команда не прошла', { reason: String(error) });
      }
    },
    [bandRef],
  );

  const vibrate = withBand(async (active) => {
    await active.find(true);
    // Останавливаем сами: устройство будет вибрировать, пока его не попросят
    // перестать, и человек с этим ничего не сделает.
    setTimeout(() => void active.find(false), BUZZ_MS);
  });

  const measure = withBand(async (active) => {
    patch({ measurement: undefined });
    await active.measure();
  });

  const startRecording = withBand(async (active) => {
    await active.recorder.start();
    patch({ recording: true });
  });

  const stopRecording = withBand(async (active) => {
    await active.recorder.stop();
    patch({ recording: false });
  });

  const pullRecordings = useCallback(async () => {
    if (!deviceId) return;

    patch({ busy: true });
    try {
      // Выгрузка переподключается сама: браслет держит одно соединение, и
      // держать его открытым во время долгой качки незачем.
      await bandRef.current?.disconnect();
      bandRef.current = null;

      await syncRecordings(deviceId);
      bandRef.current = await Band.connect(deviceId);

      patch({ saved: savedRecordings() });
      await refresh();
    } catch (error) {
      logger.warn('band: выгрузка записей не удалась', { reason: String(error) });
    } finally {
      patch({ busy: false });
    }
  }, [bandRef, deviceId, patch, refresh]);

  return { vibrate, measure, startRecording, stopRecording, pullRecordings };
}
