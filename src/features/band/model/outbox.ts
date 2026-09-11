import AsyncStorage from '@react-native-async-storage/async-storage';

import type { JsonValue } from '@/core/http/client';
import { logger } from '@/core/log/logger';

import type { BandStream, Coverage, IngestionRecord, TimeQuality } from '../api';
import { uuidFrom } from '../api';

import { dayKey } from './history-store';
import { capped, isSnapshot, mergeCoverage, pruneSeen, pruneSnapshots } from './outbox-pack';
import { keyOf, load, save, type PendingRecord } from './outbox-store';
import { serial } from './serial';

/**
 * Очередь на отправку: что браслет намерил, а сервер ещё не подтвердил.
 *
 * Своя, а не «отправим прямо при чтении»: чтение идёт по Bluetooth в метро и в
 * лифте, отправка — по сети, которой в этот момент нет. Между ними обязана
 * стоять очередь, переживающая перезапуск, иначе прочитанное с устройства
 * теряется — на браслете история живёт около четырёх суток и затирается молча.
 *
 * Очередь принадлежит паре «аккаунт и браслет». Отправить накопленное от
 * имени другого человека нельзя: приёмник примет это как его измерения.
 */

/**
 * Сколько раз запись, которую приёмник не смог разобрать «временно»,
 * отправляется заново. Дальше причина уже не временная, и держать запись в
 * очереди значит гонять её вечно.
 */
const MAX_ATTEMPTS = 3;

/**
 * Заготовка записи: что произошло и когда. Идентификатор и порядковый номер
 * ставит очередь — вызывающему их знать неоткуда.
 */
export type Draft = {
  stream: BandStream;
  /**
   * Естественный ключ события внутри потока: минута, дата, начало сессии.
   * Из него считается устойчивый `eventId`, поэтому ключ обязан описывать
   * именно **событие**, а не момент его чтения.
   */
  key: string;
  /**
   * Время самого события: минута замера, начало ночи, дата суток. По нему
   * очередь понимает, что уже уехало, — и это **не** момент чтения. Момент
   * чтения приёмник называет `capturedAt` и ставит его вся пачка разом.
   */
  at: Date;
  payload: JsonValue;
};

export type EnqueueOptions = {
  timeQuality: TimeQuality;
  /** Эпоха часов устройства на момент чтения. */
  epoch?: string | null;
  /** Окна, которые клиент считает вычитанными. Уезжают с ближайшей пачкой. */
  coverage?: readonly Coverage[];
};

/**
 * Поставить прочитанное в очередь.
 *
 * Повторное чтение тех же суток — обычный случай: раздел обновляют кнопкой, и
 * история за сегодня приходит целиком каждый раз. Заново уезжает только то,
 * чего в очереди ещё не было, иначе каждое обновление гнало бы на сервер весь
 * день поминутно. Ничего нового — ничего не пишем: очередь весит до мегабайта,
 * и переписывать её ради того же содержимого незачем.
 */
export function enqueue(
  account: string,
  bandId: string,
  drafts: readonly Draft[],
  options: EnqueueOptions,
): Promise<void> {
  return serial(async () => {
    const stored = await load(account, bandId);
    const now = new Date();
    // Момент чтения один на всю порцию: это и есть «когда клиент это получил».
    const capturedAt = now.toISOString();
    const seen = pruneSeen(stored.seen, now);
    const snapshots = pruneSnapshots(stored.snapshots ?? {}, now);
    let { sequence } = stored;
    const pending = [...stored.pending];
    // Записи внутри замороженной пачки трогать нельзя: она уже могла уехать.
    const frozen = stored.delivery?.records ?? 0;

    for (const draft of drafts) {
      const slot = `${draft.stream}|${dayKey(draft.at)}`;
      const at = draft.at.getTime();
      const snapshot = isSnapshot(draft.stream);

      if (!snapshot && at <= (seen[slot] ?? -Infinity)) continue;

      sequence += 1;
      // Личность события: для измерений — что и когда, для снимков — ещё и
      // содержимое. Сводка дня в полдень и вечером — разные события: приёмник
      // не даёт менять содержимое под уже принятым идентификатором.
      const identity = snapshot
        ? `${bandId}|${draft.stream}|${draft.key}|${JSON.stringify(draft.payload)}`
        : `${bandId}|${draft.stream}|${draft.key}`;
      const record: PendingRecord = {
        eventId: uuidFrom(identity),
        sequence,
        stream: draft.stream,
        capturedAt,
        timeQuality: options.timeQuality,
        payload: draft.payload,
        epoch: options.epoch ?? null,
        slot: snapshot ? slot : undefined,
      };

      seen[slot] = Math.max(seen[slot] ?? 0, at);

      // Этот снимок приёмник уже получил: содержимое не изменилось, значит и
      // имя то же, а повтор под принятым именем он считает конфликтом.
      if (snapshot && snapshots[slot] === record.eventId) {
        sequence -= 1;
        continue;
      }

      // Такое событие уже в очереди — в замороженной пачке или за ней: второй
      // экземпляр приёмник отвергает вместе со всей пачкой как дубль.
      if (pending.some((item) => item.eventId === record.eventId)) {
        sequence -= 1;
        continue;
      }

      // Снимок в очереди замещает прежний того же дня: отправлять обе версии
      // значит гнать заведомо устаревшую. Замороженный не трогаем — он уже
      // мог уехать, новый встанет следом.
      const stale = snapshot
        ? pending.findIndex((item, index) => index >= frozen && item.slot === slot)
        : -1;
      if (stale === -1) pending.push(record);
      else pending[stale] = record;
    }

    const coverage = mergeCoverage(stored.coverage, options.coverage ?? []);
    const unchanged = sequence === stored.sequence && coverage.length === stored.coverage.length;
    if (unchanged) return;

    await save(account, bandId, {
      sequence,
      pending: capped(pending, frozen),
      coverage,
      delivery: stored.delivery,
      seen,
      snapshots,
    });
  });
}

/**
 * Вернуть в очередь записи, которые приёмник принял, но разобрать не смог по
 * временной причине. Идентичность прежняя — событие то же; порядковый номер
 * новый — это новая отправка. После нескольких кругов запись отбрасывается:
 * причина, которая не проходит трижды, временной уже не является.
 */
export function requeue(
  account: string,
  bandId: string,
  records: readonly IngestionRecord[],
  epoch: string | null,
): Promise<void> {
  return serial(async () => {
    const stored = await load(account, bandId);
    const retries: Record<string, number> = {};
    let { sequence } = stored;
    const pending = [...stored.pending];

    for (const record of records) {
      // Пока пачка ездила, свежее чтение могло поставить то же событие заново:
      // второй экземпляр в одной пачке приёмник не принимает.
      if (pending.some((item) => item.eventId === record.eventId)) continue;

      const tries = (stored.retries?.[record.eventId] ?? 0) + 1;
      if (tries >= MAX_ATTEMPTS) {
        logger.error('band: запись не разбирается приёмником, отброшена', {
          stream: record.stream,
          eventId: record.eventId,
        });
        continue;
      }
      sequence += 1;
      pending.push({ ...record, sequence, epoch });
      retries[record.eventId] = tries;
    }

    if (sequence === stored.sequence) return;
    // Счёт держим только по записям, которые ещё в очереди: остальным он не
    // понадобится, а карта иначе росла бы без предела.
    for (const item of pending) {
      const known = stored.retries?.[item.eventId];
      if (known !== undefined && retries[item.eventId] === undefined) retries[item.eventId] = known;
    }
    await save(account, bandId, { ...stored, sequence, pending, retries });
  });
}

/**
 * Забыть очередь целиком.
 *
 * Вызывается, когда человек отвязал браслет: накопленное принадлежало прежней
 * привязке, и молча отправлять его под новой версией нельзя — приёмник об этом
 * предупреждает прямо. Поэтому и неудача здесь — ошибка, а не шум.
 */
export function clearOutbox(account: string, bandId: string): Promise<void> {
  return serial(() =>
    AsyncStorage.removeItem(keyOf(account, bandId)).catch((failure: unknown) =>
      logger.error('band: очередь отправки не стёрлась', { failure }),
    ),
  );
}
