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
  type StressSample,
  connectedBands,
  dropConnection,
  mergeFound,
  scanForBands,
  sortByProximity,
  startBackgroundSync,
  stopBackgroundSync,
} from '@/core/band';
import { logger } from '@/core/log/logger';
import { setPairedBand, usePairedBand } from '@/shared/domain';

import { useBandActions } from './band-actions';
import { clearSnapshot, loadEverything, loadSnapshot, saveSnapshot } from './band-data';
import { appendSample } from './day-metrics';

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
  /** Поминутная история за сегодня: из неё строятся все графики дня. */
  today: ActivitySample[];
  stress: StressSample[];
  recordings: Recording[];
  saved: SavedRecording[];
  storage?: Storage;
  /** Идёт ли запись прямо сейчас. */
  recording: boolean;
  busy: boolean;
};

/** Как часто обновлять сводку дня при открытом разделе. */
const LIVE_POLL_MS = 30_000;

const INITIAL: BandState = {
  stage: 'idle',
  found: [],
  sleep: [],
  today: [],
  stress: [],
  recordings: [],
  saved: [],
  recording: false,
  busy: false,
};

export function useBand() {
  const paired = usePairedBand();
  const [state, setState] = useState<BandState>(INITIAL);
  const band = useRef<Band | null>(null);
  const stopScan = useRef<(() => void) | null>(null);
  /** Зеркало состояния: снимок на диск пишется вне рендера, из обработчиков. */
  const latest = useRef<BandState>(INITIAL);

  const patch = useCallback((next: Partial<BandState>) => {
    setState((current) => {
      const merged = { ...current, ...next };
      latest.current = merged;
      return merged;
    });
  }, []);

  // Показания с прошлого запуска — сразу, не дожидаясь Bluetooth. Они лежат на
  // диске телефона и от сессии в аккаунте не зависят: раздел не должен
  // начинаться с пустых графиков только потому, что связь ещё не поднялась.
  useEffect(() => {
    void loadSnapshot().then((snapshot) => {
      if (snapshot) patch(snapshot);
    });
  }, [patch]);

  // Браслет мог остаться на связи с телефоном — от прошлого запуска, от
  // системы, от приложения вендора. В эфире такого не найти: подключённое
  // устройство перестаёт рекламировать себя, и поиск молчал бы вечно.
  useEffect(() => {
    if (paired) return;
    void connectedBands().then((bands) => {
      if (bands.length > 0) patch({ found: sortByProximity(bands) });
    });
  }, [paired, patch]);

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
      await loadEverything(active, patch);
      saveSnapshot(latest.current);
    } finally {
      patch({ busy: false });
    }
  }, [patch]);

  // Пока раздел открыт, сводка дня подтягивается сама: шаги и калории живой
  // отчёт не несёт, а смотреть на цифры получасовой давности при подключённом
  // браслете незачем.
  useEffect(() => {
    if (state.stage !== 'connected') return;

    const timer = setInterval(() => {
      void band.current
        ?.daySummary()
        .then((summary) => patch({ summary }))
        .catch((failure: unknown) =>
          logger.warn('band: сводка не обновилась', { reason: String(failure) }),
        );
    }, LIVE_POLL_MS);

    return () => clearInterval(timer);
  }, [patch, state.stage]);

  const connect = useCallback(
    async (device: FoundBand) => {
      stopScan.current?.();
      patch({ stage: 'connecting', device: { id: device.id, name: device.name } });

      try {
        const connected = await Band.connect(device.id);
        band.current = connected;

        connected.subscribe((event) => {
          if (event.kind === 'activity') {
            // Живой отчёт идёт и в историю: пока приложение открыто, графики
            // дня продолжаются сами, без повторного вычитывания всей истории.
            const sample = event.sample;
            patch({ live: sample, today: appendSample(latest.current.today, sample) });
          }
          if (event.kind === 'measurement') patch({ measurement: event.measurement });
          if (event.kind === 'wear') patch({ worn: event.worn });
          if (event.kind === 'disconnected') {
            // Связь оборвалась: держать живой браслет в руках больше нельзя, а
            // данные остаются на экране как последние известные.
            band.current = null;
            patch({ stage: 'idle', recording: false });
          }
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

        // Привязка живёт на телефоне рядом с показаниями: браслет принадлежит
        // устройству, а не аккаунту, и переподключаться после каждого входа
        // человек не должен.
        setPairedBand({ id: device.id, name: device.name, pairedAt: new Date().toISOString() });
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
    // Данные и привязка остаются: отключение — это разрыв связи, а не отказ от
    // браслета. Забыть его — отдельное действие.
    patch({ stage: 'idle', found: [], problem: undefined });
  }, [patch]);

  /**
   * Забыть браслет: отвязать на устройстве, разорвать связь и стереть память
   * телефона. Порядок важен — снять привязку можно только пока связь жива, а
   * после разрыва браслет уже недоступен.
   */
  const forget = useCallback(async () => {
    const active = band.current;
    const deviceId = latest.current.device?.id ?? paired?.id;
    band.current = null;

    if (active) {
      try {
        await active.admin.unbind();
      } catch (error) {
        logger.warn('band: устройство не отвязалось', { reason: String(error) });
      }
      await active.disconnect().catch(() => undefined);
    }

    // Связь могли держать и без нас: другой экран, прошлый запуск, система.
    if (deviceId) await dropConnection(deviceId);
    await stopBackgroundSync();

    setPairedBand(null);
    clearSnapshot();
    latest.current = INITIAL;
    setState(INITIAL);
  }, [paired]);

  // Запомненный браслет поднимается сам: человек привязал его один раз, и
  // нажимать «искать» при каждом запуске незачем. Промах уводит в 'failed', и
  // на экране появляется кнопка повтора — молча в поиске зависать нельзя.
  const attempted = useRef(false);
  useEffect(() => {
    if (!paired || attempted.current) return;
    attempted.current = true;
    void connect({ id: paired.id, name: paired.name, rssi: 0 });
  }, [connect, paired]);

  const actions = useBandActions({ bandRef: band, patch, refresh, deviceId: state.device?.id });

  return {
    state,
    scan,
    connect,
    disconnect,
    forget,
    paired,
    refresh,
    ...actions,
  };
}
