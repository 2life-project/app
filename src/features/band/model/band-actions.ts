import { useCallback, type MutableRefObject } from 'react';

import { logger } from '@/core/log/logger';

import { Band, removeSaved, savedRecordings, syncRecordings } from '../api';

import type { BandState } from './use-band';
import { startSession } from './workout-session';
import { rememberWorkout, toRecord } from './workout-store';

/** Сколько вибрировать по кнопке «найти»: дальше человек и так услышал. */
const BUZZ_MS = 3000;

type Options = {
  /** Живое соединение. Ссылкой, а не значением: команды переживают перерисовку. */
  bandRef: MutableRefObject<Band | null>;
  /** Взять браслет под управление: присвоение вместе с подпиской на отчёты. */
  adopt: (next: Band | null) => void;
  patch: (next: Partial<BandState>) => void;
  refresh: () => Promise<void>;
  deviceId?: string;
  /** Зеркало состояния: финиш читает занятие вне рендера. */
  stateRef: MutableRefObject<BandState>;
  /** Каким видом спорта помечать занятие. */
  sport: number;
};

/**
 * Команды браслету: то, что человек нажимает, а не то, что читается само.
 *
 * Вынесены из состояния намеренно — состояние отвечает за связь и данные, а
 * здесь только действия, и каждое из них тихо ничего не делает, если связи нет.
 */
export function useBandActions({
  bandRef,
  adopt,
  patch,
  refresh,
  deviceId,
  stateRef,
  sport,
}: Options) {
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
      adopt(null);

      await syncRecordings(deviceId);
      adopt(await Band.connect(deviceId));

      patch({ saved: savedRecordings() });
      await refresh();
    } catch (error) {
      // Связь после выгрузки могла не подняться. Оставить экран подключённым
      // нельзя: кнопки останутся живыми и будут молча ничего не делать.
      logger.error('band: выгрузка записей не удалась', { reason: String(error) });
      adopt(null);
      patch({ stage: 'idle', recording: false, problem: 'connect-failed' });
    } finally {
      patch({ busy: false });
    }
  }, [adopt, bandRef, deviceId, patch, refresh]);

  /** Убрать скачанную запись с телефона. На браслете её уже нет — выгрузка стирает. */
  const removeRecording = useCallback(
    (session: number) => {
      removeSaved(session);
      patch({ saved: savedRecordings() });
    },
    [patch],
  );

  /**
   * Начать занятие. Считать его будет браслет, а копить — мы: устройство
   * присылает секунду за секундой и после финиша ничего не сохраняет.
   */
  const startWorkout = withBand(async (active) => {
    await active.workouts.start(sport);
    patch({ session: startSession(sport) });
  });

  /** Завершить занятие и записать его на телефон — больше его нигде нет. */
  const stopWorkout = useCallback(async () => {
    const session = stateRef.current.session;
    if (!session) return;

    try {
      await bandRef.current?.workouts.finish(session.sport, {
        seconds: session.seconds,
        distance: session.distance,
        calories: session.calories,
      });
    } catch (error) {
      // Занятие всё равно записываем: данные уже собраны, и терять их из-за
      // того, что не доехала команда финиша, нельзя.
      logger.error('band: финиш тренировки не прошёл', { reason: String(error) });
    }

    patch({ session: undefined, recorded: await rememberWorkout(toRecord(session)) });
  }, [bandRef, patch, stateRef]);

  return {
    vibrate,
    measure,
    startRecording,
    stopRecording,
    pullRecordings,
    removeRecording,
    startWorkout,
    stopWorkout,
  };
}
