import { useCallback, type MutableRefObject } from 'react';

import { logger } from '@/core/log/logger';
import type { BodyProfile } from '@/shared/domain';

import { type Band, removeSaved, savedRecordings } from '../api';

import type { BandState } from './band-state';
import { sendProfile } from './profile-sync';
import { startSession } from './workout-session';
import { clearOpenSession, rememberWorkout, saveOpenSession, toRecord } from './workout-store';

/** Сколько вибрировать по кнопке «найти»: дальше человек и так услышал. */
const BUZZ_MS = 3000;

type Options = {
  /** Живое соединение. Ссылкой, а не значением: команды переживают перерисовку. */
  bandRef: MutableRefObject<Band | null>;
  /** Забрать записи с устройства по живому соединению и отправить их. */
  collect: () => Promise<void>;
  patch: (next: Partial<BandState>) => void;
  /** Зеркало состояния: финиш читает занятие вне рендера. */
  stateRef: MutableRefObject<BandState>;
};

/**
 * Команды браслету: то, что человек нажимает, а не то, что читается само.
 *
 * Вынесены из состояния намеренно — состояние отвечает за связь и данные, а
 * здесь только действия, и каждое из них тихо ничего не делает, если связи нет.
 */
export function useBandActions({ bandRef, collect, patch, stateRef }: Options) {
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

  /**
   * Забрать записи по кнопке. Сама выгрузка та же, что и по финишу записи:
   * кнопка нужна, когда событие финиша не дошло, а запись на устройстве есть.
   */
  const pullRecordings = useCallback(async () => {
    patch({ busy: true });
    try {
      await collect();
    } finally {
      patch({ busy: false });
    }
  }, [collect, patch]);

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
      // Без связи это не отказ: профиль лежит на телефоне и уедет при
      // следующем подключении. А вот отказ живого устройства — отказ.
      if (!active) return;
      patch({ profileSent: await sendProfile(active, profile) });
    },
    [bandRef, patch],
  );

  /**
   * Начать занятие. Считать его будет браслет, а копить — мы: устройство
   * присылает секунду за секундой и после финиша ничего не сохраняет.
   */
  const startWorkout = useCallback(
    async (sport: number) => {
      const active = bandRef.current;
      if (!active) return;

      // Занятие уже идёт — второй старт затёр бы накопленное. После обрыва
      // связи сессия остаётся в памяти, и повторное нажатие теряло бы час ряда
      // пульса.
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
    },
    [bandRef, patch, stateRef],
  );

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
