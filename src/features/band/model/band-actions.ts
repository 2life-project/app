import { useCallback, type MutableRefObject } from 'react';

import { logger } from '@/core/log/logger';
import type { BodyProfile } from '@/shared/domain';

import { Band, removeSaved, savedRecordings, syncRecordings } from '../api';

import type { BandState } from './band-state';
import { sendProfile } from './profile-sync';
import { startSession } from './workout-session';
import { clearOpenSession, rememberWorkout, saveOpenSession, toRecord } from './workout-store';

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

    // Выгрузка рвёт соединение и поднимает его заново. Во время занятия это
    // обрывает секундный поток, и цифры на экране замирают до самого финиша —
    // человеку при этом ничего не сообщается.
    if (stateRef.current.session) return;

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
  }, [adopt, bandRef, deviceId, patch, refresh, stateRef]);

  /** Убрать скачанную запись с телефона. На браслете её уже нет — выгрузка стирает. */
  const removeRecording = useCallback(
    (session: number) => {
      removeSaved(session);
      patch({ saved: savedRecordings() });
    },
    [patch],
  );

  /**
   * Отправить профиль тела на устройство.
   *
   * Отдельным действием, а не только при подключении: человек правит рост или
   * вес при живой связи, и ждать переподключения ради этого незачем. Без связи
   * ничего не делаем — профиль уже сохранён на телефоне и уедет при следующем
   * подключении.
   */
  const saveProfile = useCallback(
    async (profile: BodyProfile) => {
      const active = bandRef.current;
      if (active) await sendProfile(active, profile);
    },
    [bandRef],
  );

  /**
   * Начать занятие. Считать его будет браслет, а копить — мы: устройство
   * присылает секунду за секундой и после финиша ничего не сохраняет.
   */
  const startWorkout = useCallback(async () => {
    const active = bandRef.current;
    if (!active) return;

    // Занятие уже идёт — второй старт затёр бы накопленное. После обрыва связи
    // сессия остаётся в памяти, и повторное нажатие теряло бы час ряда пульса.
    if (stateRef.current.session) return;

    // Сессия заводится до команды: устройство начинает слать кадры сразу, и
    // те, что придут раньше, иначе просто выбрасываются.
    const session = startSession(sport);
    patch({ session });
    await saveOpenSession(session);

    try {
      await active.workouts.start(sport);
    } catch (error) {
      logger.error('band: тренировка не начата', { reason: String(error) });
      patch({ session: undefined, problem: 'workout-failed' });
      await clearOpenSession();
    }
  }, [bandRef, patch, sport, stateRef]);

  /**
   * Завершить занятие.
   *
   * Порядок важен: сначала запись на диск, потом команда устройству. Данные
   * уже собраны, и терять их из-за не доехавшей команды нельзя — а показать
   * сохранённым то, что на диск не легло, нельзя тем более.
   */
  const stopWorkout = useCallback(async () => {
    // Берём самое свежее: пока идёт команда финиша, тики продолжают приходить.
    const session = stateRef.current.session;
    if (!session) return;

    try {
      patch({ recorded: await rememberWorkout(toRecord(session)) });
    } catch (error) {
      // Единственная копия занятия — эта. Сессию не закрываем: человек увидит,
      // что тренировка идёт, и сможет попробовать снова.
      logger.error('band: тренировка не сохранилась', { reason: String(error) });
      patch({ problem: 'workout-save-failed' });
      return;
    }

    patch({ session: undefined, problem: undefined });
    await clearOpenSession();

    try {
      await bandRef.current?.workouts.finish(session.sport, {
        seconds: session.seconds,
        distance: session.distance,
        calories: session.calories,
      });
    } catch (error) {
      // Занятие уже записано, но устройство осталось в режиме тренировки: оно
      // продолжит слать кадры раз в секунду и жечь батарею, пока не узнает.
      logger.error('band: браслет не закрыл тренировку', { reason: String(error) });
      patch({ problem: 'workout-open' });
    }
  }, [bandRef, patch, stateRef]);

  return {
    vibrate,
    measure,
    startRecording,
    stopRecording,
    pullRecordings,
    removeRecording,
    saveProfile,
    startWorkout,
    stopWorkout,
  };
}
