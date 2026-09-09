import { useEffect, useRef } from 'react';

import type { BandState } from './band-state';
import type { WorkoutSession } from './workout-session';
import { loadOpenSession, saveOpenSession } from './workout-store';

/** Раз во сколько секунд занятия сбрасывать его на диск. */
const SAVE_EVERY_SECONDS = 15;

/**
 * Незавершённое занятие переживает перезапуск.
 *
 * Тренировка существует только у нас: устройство её не хранит и после финиша
 * отдаёт по ней нули. Пока она жила в состоянии до нажатия «Завершить»,
 * закрытие приложения, выгрузка из памяти и уход с экрана стирали её молча —
 * при том что на экране написано, что она сохранится.
 */
export function useOpenSession(
  session: WorkoutSession | undefined,
  patch: (next: Partial<BandState>) => void,
): void {
  const latest = useRef<WorkoutSession | undefined>(undefined);

  useEffect(() => {
    void loadOpenSession().then((open) => {
      if (open) patch({ session: open });
    });
  }, [patch]);

  useEffect(() => {
    latest.current = session;
    if (!session || session.seconds % SAVE_EVERY_SECONDS !== 0) return;
    void saveOpenSession(session);
  }, [session]);

  // Уход с экрана — тоже повод дописать: следующего тика может не быть.
  useEffect(() => {
    return () => {
      if (latest.current) void saveOpenSession(latest.current);
    };
  }, []);
}
