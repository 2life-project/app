import { useCallback, useEffect, useRef, useState } from 'react';

import {
  Band,
  type ActivitySample,
  type DaySummary,
  type FoundBand,
  type Measurement,
  type Recording,
  type SavedRecording,
  type ScanProblem,
  type SleepSegment,
  type Storage,
  mergeFound,
  savedRecordings,
  scanForBands,
  startBackgroundSync,
  syncRecordings,
} from '@/core/band';
import { logger } from '@/core/log/logger';

/**
 * Состояние работы с браслетом: поиск, подключение и всё, что устройство отдаёт.
 *
 * Живёт одним хуком намеренно: у браслета одно соединение на приложение, и
 * разнести его по нескольким независимым состояниям — значит получить два
 * экрана, спорящих за радио.
 */

export type BandStage = 'idle' | 'scanning' | 'connecting' | 'connected' | 'failed';

export type BandState = {
  stage: BandStage;
  problem?: ScanProblem | 'connect-failed';
  found: FoundBand[];
  device?: { id: string; name: string };
  battery?: number;
  firmware?: string;
  /** Последний живой отчёт: приходит сам каждые десять секунд. */
  live?: ActivitySample;
  summary?: DaySummary;
  measurement?: Measurement;
  worn?: boolean;
  sleep: SleepSegment[];
  recordings: Recording[];
  saved: SavedRecording[];
  storage?: Storage;
  /** Идёт ли запись прямо сейчас. */
  recording: boolean;
  busy: boolean;
};

const INITIAL: BandState = {
  stage: 'idle',
  found: [],
  sleep: [],
  recordings: [],
  saved: [],
  recording: false,
  busy: false,
};

export function useBand() {
  const [state, setState] = useState<BandState>(INITIAL);
  const band = useRef<Band | null>(null);
  const stopScan = useRef<(() => void) | null>(null);

  const patch = useCallback((next: Partial<BandState>) => {
    setState((current) => ({ ...current, ...next }));
  }, []);

  useEffect(() => {
    return () => {
      stopScan.current?.();
      void band.current?.disconnect();
    };
  }, []);

  const scan = useCallback(async () => {
    stopScan.current?.();
    patch({ stage: 'scanning', found: [], problem: undefined });

    const result = await scanForBands((device) => {
      setState((current) => ({ ...current, found: mergeFound(current.found, device) }));
    });

    if (!result.ok) {
      patch({ stage: 'failed', problem: result.problem });
      return;
    }
    stopScan.current = result.stop;
  }, [patch]);

  /** Обновить всё, что читается разом. Вызывается после подключения и по кнопке. */
  const refresh = useCallback(async () => {
    const active = band.current;
    if (!active) return;

    patch({ busy: true });
    try {
      const [info, summary, recordings, storage] = await Promise.all([
        active.info(),
        active.daySummary(),
        active.recordings(),
        active.storage(),
      ]);

      const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const sleep = await active.sleep(week, new Date());

      patch({
        battery: info.battery?.level,
        firmware: info.firmware,
        summary,
        recordings,
        storage: storage ?? undefined,
        sleep,
        saved: savedRecordings(),
      });
    } catch (error) {
      logger.warn('band: не удалось обновить данные', { reason: String(error) });
    } finally {
      patch({ busy: false });
    }
  }, [patch]);

  const connect = useCallback(
    async (device: FoundBand) => {
      stopScan.current?.();
      patch({ stage: 'connecting', device: { id: device.id, name: device.name } });

      try {
        const connected = await Band.connect(device.id);
        band.current = connected;

        connected.subscribe((event) => {
          if (event.kind === 'activity') patch({ live: event.sample });
          if (event.kind === 'measurement') patch({ measurement: event.measurement });
          if (event.kind === 'wear') patch({ worn: event.worn });
          if (event.kind === 'recorder') {
            const recorderEvent = event.event;
            if (recorderEvent.kind === 'started') patch({ recording: true });
            if (recorderEvent.kind === 'finished') {
              patch({ recording: false });
              void refresh();
            }
          }
        });

        // Пульс раз в минуту: это минимум, который принимает прошивка, и с ним
        // живые отчёты приходят каждые десять секунд.
        await connected.watchHeartRate(1);
        await startBackgroundSync(device.id);

        patch({ stage: 'connected' });
        await refresh();
      } catch (error) {
        logger.warn('band: подключение не удалось', { reason: String(error) });
        patch({ stage: 'failed', problem: 'connect-failed' });
      }
    },
    [patch, refresh],
  );

  const disconnect = useCallback(async () => {
    await band.current?.disconnect();
    band.current = null;
    setState(INITIAL);
  }, []);

  /** Действие, которое требует подключения: без него кнопки просто не сработают. */
  const withBand = useCallback(
    (action: (active: Band) => Promise<void>) => async () => {
      const active = band.current;
      if (!active) return;

      try {
        await action(active);
      } catch (error) {
        logger.warn('band: команда не прошла', { reason: String(error) });
      }
    },
    [],
  );

  const vibrate = withBand(async (active) => {
    await active.find(true);
    // Останавливаем сами: устройство будет вибрировать, пока его не попросят
    // перестать, и человек с этим ничего не сделает.
    setTimeout(() => void active.find(false), 3000);
  });

  const measure = withBand(async (active) => {
    patch({ measurement: undefined });
    await active.measure();
  });

  const startRecording = withBand(async (active) => {
    await active.startRecording();
    patch({ recording: true });
  });

  const stopRecording = withBand(async (active) => {
    await active.stopRecording();
    patch({ recording: false });
  });

  const pullRecordings = useCallback(async () => {
    const device = state.device;
    if (!device) return;

    patch({ busy: true });
    try {
      // Выгрузка переподключается сама: браслет держит одно соединение, и
      // держать его открытым во время долгой качки незачем.
      await band.current?.disconnect();
      band.current = null;

      await syncRecordings(device.id);
      const connected = await Band.connect(device.id);
      band.current = connected;

      patch({ saved: savedRecordings() });
      await refresh();
    } catch (error) {
      logger.warn('band: выгрузка записей не удалась', { reason: String(error) });
    } finally {
      patch({ busy: false });
    }
  }, [patch, refresh, state.device]);

  return {
    state,
    scan,
    connect,
    disconnect,
    refresh,
    vibrate,
    measure,
    startRecording,
    stopRecording,
    pullRecordings,
  };
}
