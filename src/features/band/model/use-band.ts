import { useCallback, useEffect, useRef, useState } from 'react';

import { logger } from '@/core/log/logger';
import { setPairedBand, syncBodyProfile, usePairedBand } from '@/shared/domain';

import { Band, type FoundBand, mergeFound, scanForBands } from '../api';

import { uploadRecordings } from './audio-upload';
import { startBackgroundSync } from './background';
import { useBandActions } from './band-actions';
import { backfillHistory, loadEverything, saveSnapshot } from './band-data';
import { INITIAL, type BandState } from './band-state';
import { forgetBand } from './forget-band';
import { sendProfile } from './profile-sync';
import { publishReadings } from './publish-readings';
import { publishDays, publishToServer } from './upload';
import { useAlarms } from './use-alarms';
import { useBandBoot, useLivePoll } from './use-band-boot';
import { useBandEvents } from './use-band-events';
import { useForeground } from './use-foreground';
import { useOpenSession } from './use-open-session';
import { useReconnect } from './use-reconnect';
import { useService } from './use-service';
import { useDeviceSettings } from './use-settings';

/**
 * Состояние работы с браслетом: поиск, подключение и всё, что устройство отдаёт.
 *
 * Живёт одним хуком намеренно: у браслета одно соединение на приложение, и
 * разнести его по нескольким независимым состояниям — значит получить два
 * экрана, спорящих за радио.
 */

export type BandStage = 'idle' | 'scanning' | 'connecting' | 'connected' | 'failed';

/** Сколько связь должна продержаться, чтобы считаться устойчивой. */
const STABLE_CONNECTION_MS = 60_000;

export function useBand() {
  const paired = usePairedBand();
  const foreground = useForeground();
  const [state, setState] = useState<BandState>(INITIAL);
  const band = useRef<Band | null>(null);
  const stopScan = useRef<(() => void) | null>(null);
  /**
   * Какая по счёту попытка переподключения идёт.
   *
   * Сбрасывается не любой удачей, а только устоявшейся связью: при мигающем
   * соединении «подключился — через секунду оборвался» счёт иначе обнулялся
   * каждым циклом, пауза навсегда оставалась минимальной, и каждый круг тянул
   * полное чтение устройства — десятки обменов по радио на его же заряде.
   */
  const retry = useRef(0);
  /** Когда поднялась текущая связь: по ней видно, была она устойчивой или мигнула. */
  const connectedSince = useRef<number | null>(null);
  /** Профиль, который уже принят устройством: второй раз то же самое не шлём. */
  const sentProfile = useRef<string | null>(null);
  /** Человек отключился сам — тогда обратно его не тащим. */
  const manual = useRef(false);
  /** Зеркало состояния: снимок на диск пишется вне рендера, из обработчиков. */
  const latest = useRef<BandState>(INITIAL);

  const patch = useCallback((next: Partial<BandState>) => {
    setState((current) => {
      const merged = { ...current, ...next };
      latest.current = merged;
      return merged;
    });
  }, []);

  useBandBoot(paired, patch);

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
      // Итоги дня — остальному приложению. Здесь, а не на каждом живом отчёте:
      // отчёты приходят каждые десять секунд, а минутные итоги между ними те же.
      publishReadings(latest.current);

      // Отправка — без ожидания. Она ходит в сеть, а этот же `refresh`
      // стоит на пути подключения: дождись мы ответа сервера, человек
      // столько же секунд смотрел бы на «читаем…» из-за чужой сети.
      void publishToServer(latest.current);
      void uploadRecordings();
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

  useLivePoll({ stage: state.stage, foreground, bandRef: band, adopt, patch });

  const connect = useCallback(
    async (device: FoundBand) => {
      stopScan.current?.();
      manual.current = false;
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

        // Счёт попыток обнуляет только связь, которая продержалась: короткая
        // предыдущая сессия означает, что устройство мигает, и пауза должна
        // продолжать расти, а не начинаться заново.
        const lasted =
          connectedSince.current === null ? Infinity : Date.now() - connectedSince.current;
        if (lasted > STABLE_CONNECTION_MS) retry.current = 0;
        connectedSince.current = Date.now();

        patch({ stage: 'connected', step: 'reading', retrying: false, problem: undefined });

        // Профиль уезжает при каждом подключении, а не только при первом.
        // Прочитать, что сейчас записано в устройстве, нечем — команды чтения
        // профиля в протоколе нет, — а разойтись они могут: браслет сбрасывают
        // к заводским, вес человек меняет на другом экране. Без ожидания: связь
        // уже установлена, и держать на этом обмене экран незачем.
        // Профиль уезжает при первом подключении и после правок, а не на
        // каждом реконнекте: в плохом покрытии их десятки за час, и каждый
        // стоил бы запроса к серверу и записи по радио ради тех же чисел.
        void syncBodyProfile().then(async (profile) => {
          const wanted = JSON.stringify(profile);
          if (sentProfile.current === wanted) return;

          const sent = await sendProfile(connected, profile);
          if (sent) sentProfile.current = wanted;
          patch({ profileSent: sent });
        });

        await refresh();

        // Дочитать сутки, которые устройство ещё помнит, а телефон уже нет.
        // После `refresh`, а не вместо: экран к этому моменту уже полон, а
        // архив набивается молча — по кадру на минуту, это долго.
        patch({ step: undefined });

        // Дочитанные сутки уезжают следом: в состоянии раздела их нет, и
        // без этого они остались бы только на телефоне.
        void backfillHistory(connected)
          .then((days) => publishDays(days, connected.clockSkewSeconds))
          .catch((failure: unknown) =>
            logger.error('band: дочитанные сутки не отправились', { failure }),
          );
      } catch (error) {
        logger.warn('band: подключение не удалось', { reason: String(error) });
        patch({ stage: 'failed', step: undefined, problem: 'connect-failed' });
      }
    },
    [adopt, patch, refresh],
  );

  const disconnect = useCallback(async () => {
    // Отключение по кнопке: обратно не тащим, иначе кнопка ничего не значит.
    manual.current = true;
    await band.current?.disconnect();
    // Через тот же вход, что и берём: прямое присваивание ссылки оставляло
    // поднятым флаг «связь занята экраном», и фоновая выгрузка после первого
    // же отключения не срабатывала больше никогда — а память диктофона
    // кончается за пятнадцать часов записи.
    adopt(null);
    // Данные и привязка остаются: отключение — это разрыв связи, а не отказ от
    // браслета. Забыть его — отдельное действие.
    patch({ stage: 'idle', found: [], problem: undefined, retrying: false });
  }, [adopt, patch]);

  const forget = useCallback(async () => {
    await forgetBand({ bandRef: band, latest, pairedId: paired?.id });
    // Раздел начинается заново: ни связи, ни зеркала, ни состояния.
    band.current = null;
    latest.current = INITIAL;
    setState(INITIAL);
  }, [paired]);

  // Связь возвращается сама: правило пауз и условия попыток — в своём файле,
  // потому что это отдельная забота, а не часть чтения данных.
  useReconnect({
    paired,
    stage: state.stage,
    foreground,
    attempt: retry,
    manual,
    patch,
    connect,
  });

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
