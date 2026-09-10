import { useCallback, useState, type MutableRefObject } from 'react';

import { logger } from '@/core/log/logger';

import type { Alarm, Band } from '../api';

/**
 * Будильники устройства.
 *
 * Своё состояние, а не часть общего: список читается по требованию — двадцать
 * обменов по радио ради экрана, который человек может ни разу не открыть.
 *
 * Каждая операция возвращает весь список, потому что устройство принимает его
 * только целиком. И каждая говорит, прошла ли она: «будильник молча не
 * сохранился» человек узнаёт утром, когда не проснулся.
 */

export type AlarmDraft = {
  slot?: number;
  hour: number;
  minute: number;
  days: number;
  enabled: boolean;
  label?: string;
};

export type Alarms = {
  list: Alarm[] | null;
  /** Сколько ячеек у прошивки. Больше не добавить — устройство молча не сохранит. */
  limit?: number;
  busy: boolean;
  /** Последняя операция не прошла: связь оборвалась или ячейки кончились. */
  problem: 'read' | 'write' | 'full' | null;
  load: () => Promise<void>;
  save: (draft: AlarmDraft) => Promise<boolean>;
  toggle: (slot: number, enabled: boolean) => Promise<boolean>;
  remove: (slot: number) => Promise<boolean>;
};

export function useAlarms(bandRef: MutableRefObject<Band | null>): Alarms {
  const [list, setList] = useState<Alarm[] | null>(null);
  const [limit, setLimit] = useState<number>();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Alarms['problem']>(null);

  const load = useCallback(async () => {
    const band = bandRef.current;
    if (!band) return;

    setBusy(true);
    setProblem(null);
    try {
      setList(await band.alarms.list());
      setLimit(await band.alarms.limit());
    } catch (failure) {
      logger.warn('band: будильники не прочитались', { reason: String(failure) });
      setProblem('read');
    } finally {
      setBusy(false);
    }
  }, [bandRef]);

  /** Общая обёртка записи: занятость, разбор отказа и свежий список в ответе. */
  const write = useCallback(
    async (run: (band: Band) => Promise<Alarm[]>): Promise<boolean> => {
      const band = bandRef.current;
      if (!band) return false;

      setBusy(true);
      setProblem(null);
      try {
        setList(await run(band));
        return true;
      } catch (failure) {
        const reason = String(failure);
        // Кончились ячейки — это не сбой связи, и говорить о нём надо иначе:
        // повтор не поможет, надо удалить лишний будильник.
        setProblem(/slot|ячей|full/i.test(reason) ? 'full' : 'write');
        logger.warn('band: будильник не записался', { reason });
        return false;
      } finally {
        setBusy(false);
      }
    },
    [bandRef],
  );

  const save = useCallback(
    (draft: AlarmDraft) =>
      write((band) => {
        const { slot, ...fields } = draft;
        return slot === undefined ? band.alarms.add(fields) : band.alarms.update(slot, fields);
      }),
    [write],
  );

  const toggle = useCallback(
    (slot: number, enabled: boolean) => write((band) => band.alarms.setEnabled(slot, enabled)),
    [write],
  );

  const remove = useCallback((slot: number) => write((band) => band.alarms.remove(slot)), [write]);

  return { list, limit, busy, problem, load, save, toggle, remove };
}
