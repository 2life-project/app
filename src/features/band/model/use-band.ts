import { useCallback, useEffect, useRef, useState } from 'react';

import { logger } from '@/core/log/logger';
import { setPairedBand, syncBodyProfile, usePairedBand } from '@/shared/domain';

import {
  Band,
  type FoundBand,
  connectedBands,
  dropConnection,
  mergeFound,
  scanForBands,
  sortByProximity,
  startBackgroundSync,
  stopBackgroundSync,
} from '../api';

import { useBandActions } from './band-actions';
import {
  backfillHistory,
  clearSnapshot,
  loadEverything,
  loadSnapshot,
  saveSnapshot,
} from './band-data';
import { INITIAL, type BandState } from './band-state';
import { clearHistory } from './history-store';
import { sendProfile } from './profile-sync';
import { useAlarms } from './use-alarms';
import { useBandEvents } from './use-band-events';
import { useForeground } from './use-foreground';
import { useOpenSession } from './use-open-session';
import { useService } from './use-service';
import { useDeviceSettings } from './use-settings';
import { clearOpenSession, rememberWorkout, toRecord } from './workout-store';

/**
 * Состояние работы с браслетом: поиск, подключение и всё, что устройство отдаёт.
 *
 * Живёт одним хуком намеренно: у браслета одно соединение на приложение, и
 * разнести его по нескольким независимым состояниям — значит получить два
 * экрана, спорящих за радио.
 */

export type BandStage = 'idle' | 'scanning' | 'connecting' | 'connected' | 'failed';

/** Как часто обновлять сводку дня при открытом разделе. */
const LIVE_POLL_MS = 30_000;

export function useBand() {
  const paired = usePairedBand();
  const foreground = useForeground();
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

  /**
   * Правка, считающая новое значение от актуального состояния.
   *
   * Нужна там, где отчёты приходят пачкой: `patch` берёт готовое значение,
   * посчитанное до вызова, и два кадра в одной порции обновлений считались бы
   * от одного и того же старого состояния — второй затирал бы первый.
   */
  const update = useCallback((next: (current: BandState) => Partial<BandState>) => {
    setState((current) => {
      const merged = { ...current, ...next(current) };
      latest.current = merged;
      return merged;
    });
  }, []);

  const adopt = useBandEvents({ bandRef: band, patch, update, refresh });

  useOpenSession(state.session, patch);

  // Пока раздел открыт, сводка дня подтягивается сама: шаги и калории живой
  // отчёт не несёт, а смотреть на цифры получасовой давности при подключённом
  // браслете незачем.
  useEffect(() => {
    // В фоне опрос бессмысленен: система придерживает радио, а первый же промах
    // уводил связь в 'idle' — приложение возвращалось уже отключённым.
    if (state.stage !== 'connected' || !foreground) return;

    const timer = setInterval(() => {
      void band.current
        ?.daySummary()
        .then((summary) => patch({ summary }))
        .catch((failure: unknown) => {
          // Сама по себе связь не восстановится, а опрос будет ходить в неё до
          // ухода с экрана — по строке в лог каждые полминуты, пока человек
          // смотрит на «подключено», которого нет.
          logger.error('band: связь потеряна на опросе', { reason: String(failure) });
          // Закрыть соединение обязательно: без этого подписки и открытый
          // канал остаются висеть, а браслет считает себя занятым и в эфире
          // больше не появляется.
          void band.current?.disconnect().catch(() => undefined);
          adopt(null);
          patch({ stage: 'idle' });
        });
    }, LIVE_POLL_MS);

    return () => clearInterval(timer);
  }, [adopt, foreground, patch, state.stage]);

  const connect = useCallback(
    async (device: FoundBand) => {
      stopScan.current?.();
      patch({
        stage: 'connecting',
        step: 'opening',
        device: { id: device.id, name: device.name },
      });

      try {
        const connected = await Band.connect(device.id);
        adopt(connected);
        patch({ step: 'configuring' });

        // Пульс раз в минуту: это минимум, который принимает прошивка, и с ним
        // живые отчёты приходят каждые десять секунд.
        await connected.watchHeartRate(1);
        await startBackgroundSync(device.id);

        // Привязка живёт на телефоне рядом с показаниями: браслет принадлежит
        // устройству, а не аккаунту, и переподключаться после каждого входа
        // человек не должен.
        setPairedBand({ id: device.id, name: device.name, pairedAt: new Date().toISOString() });
        patch({ stage: 'connected', step: 'reading' });

        // Профиль уезжает при каждом подключении, а не только при первом.
        // Прочитать, что сейчас записано в устройстве, нечем — команды чтения
        // профиля в протоколе нет, — а разойтись они могут: браслет сбрасывают
        // к заводским, вес человек меняет на другом экране. Без ожидания: связь
        // уже установлена, и держать на этом обмене экран незачем.
        void syncBodyProfile().then((profile) => sendProfile(connected, profile));

        await refresh();

        // Дочитать сутки, которые устройство ещё помнит, а телефон уже нет.
        // После `refresh`, а не вместо: экран к этому моменту уже полон, а
        // архив набивается молча — по кадру на минуту, это долго.
        patch({ step: undefined });

        void backfillHistory(connected, latest.current.info?.mac);
      } catch (error) {
        logger.warn('band: подключение не удалось', { reason: String(error) });
        patch({ stage: 'failed', step: undefined, problem: 'connect-failed' });
      }
    },
    [adopt, patch, refresh],
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

    // Занятие могло идти прямо сейчас. Копии на устройстве нет, поэтому
    // дописываем его перед тем, как стереть всё остальное.
    const open = latest.current.session;
    if (open) await rememberWorkout(toRecord(open)).catch(() => undefined);
    await clearOpenSession();

    setPairedBand(null);
    clearSnapshot();
    // Архив суток уходит вместе с браслетом: иначе история старого устройства
    // подмешается к новому, а разделить их будет уже нечем.
    await clearHistory().catch(() => undefined);
    latest.current = INITIAL;
    setState(INITIAL);
  }, [paired]);

  // Запомненный браслет поднимается сам: человек привязал его один раз, и
  // нажимать «искать» при каждом запуске незачем. Промах уводит в 'failed', и
  // на экране появляется кнопка повтора — молча в поиске зависать нельзя.
  const attempted = useRef<string | null>(null);

  // Возврат на экран — повод попробовать снова. Без сброса одна неудачная
  // попытка при запуске оставляла браслет неподключённым до перезапуска
  // приложения: экран уже смонтирован, а второй попытки не будет никогда.
  useEffect(() => {
    if (foreground) attempted.current = null;
  }, [foreground]);

  useEffect(() => {
    if (!paired || band.current) return;
    if (attempted.current === paired.id) return;
    attempted.current = paired.id;
    void connect({ id: paired.id, name: paired.name, rssi: 0 });
  }, [connect, paired]);

  // Будильники держат своё состояние: список читается по требованию, и тянуть
  // двадцать обменов по радио в общее состояние раздела незачем.
  const alarms = useAlarms(band);
  const settings = useDeviceSettings(band);
  const service = useService(band);

  const actions = useBandActions({
    bandRef: band,
    adopt,
    patch,
    refresh,
    deviceId: state.device?.id,
    stateRef: latest,
  });

  return {
    state,
    scan,
    connect,
    disconnect,
    forget,
    paired,
    refresh,
    alarms,
    settings,
    service,
    ...actions,
  };
}
