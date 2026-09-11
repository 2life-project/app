import AsyncStorage from '@react-native-async-storage/async-storage';

import type { JsonValue } from '@/core/http/client';
import { logger } from '@/core/log/logger';
import { requestId } from '@/shared/lib/id';

import type { BandLimits, BandStream, Coverage, IngestionRecord, TimeQuality } from '../api';
import { uuidFrom } from '../api';

import { dayKey } from './history-store';
import {
  capped,
  coverageKey,
  fittingCount,
  isSnapshot,
  mergeCoverage,
  pruneSeen,
} from './outbox-pack';
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

const PREFIX = '2life:band-outbox.1:';

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

/**
 * Запись в очереди помнит эпоху часов, под которой её прочитали. В пачке эпоха
 * одна на всех — она в конверте, — поэтому пачка режется на границе эпох:
 * данные, снятые до сброса часов устройства, нельзя выдать за снятые после.
 * Наружу эпоха не уходит.
 */
type PendingRecord = IngestionRecord & {
  epoch: string | null;
  /** Поток и сутки: по ним свежий снимок замещает в очереди прежний. */
  slot?: string;
};

type Stored = {
  sequence: number;
  pending: PendingRecord[];
  coverage: Coverage[];
  /**
   * Замороженная пачка: отправленная хоть раз, она обязана повторяться слово
   * в слово. Изменённая пачка с прежним `deliveryId` отклоняется как конфликт,
   * поэтому замораживается всё: состав записей, окна покрытия и конверт —
   * версия привязки, версия модуля, пояс и эпоха часов. Пересчитать их к
   * моменту повтора значит отправить другую пачку под старым именем.
   */
  delivery: { id: string; records: number; coverage: Coverage[]; envelope: Envelope } | null;
  /**
   * Докуда каждый поток уже поставлен в очередь, по суткам:
   * `поток|YYYY-MM-DD` → время последнего события в миллисекундах.
   *
   * По суткам, а не одним числом на поток: сегодняшняя история читается
   * первой, а пропущенные дни дочитываются после неё — общий курсор отбросил
   * бы их целиком как «старые».
   */
  seen: Record<string, number>;
  /**
   * Сколько раз запись уже уезжала заново: `eventId` → счёт. Отдельно от
   * самой записи, потому что на время пути её в очереди нет, а наружу счёт
   * уходить не должен.
   */
  retries?: Record<string, number>;
};

/** Функция, а не константа: массивы внутри не должны быть общими между чтениями. */
const empty = (): Stored => ({ sequence: 0, pending: [], coverage: [], delivery: null, seen: {} });

function keyOf(account: string, bandId: string): string {
  return `${PREFIX}${account}:${bandId}`;
}

async function load(account: string, bandId: string): Promise<Stored> {
  const key = keyOf(account, bandId);
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(key);
    return raw === null ? empty() : { ...empty(), ...(JSON.parse(raw) as Stored) };
  } catch (failure) {
    // Битую очередь нельзя затереть следующей записью молча: в ней лежит то,
    // чего на браслете уже нет. Откладываем её под соседний ключ — для
    // разбора — и начинаем заново, громко.
    logger.error('band: очередь отправки не прочиталась, отложена', { failure });
    if (raw !== null) await AsyncStorage.setItem(`${key}:broken`, raw).catch(() => undefined);
    return empty();
  }
}

async function save(account: string, bandId: string, next: Stored): Promise<void> {
  await AsyncStorage.setItem(keyOf(account, bandId), JSON.stringify(next));
}

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

/** Что описывает пачку целиком, помимо самих записей. */
export type Envelope = {
  bindingVersion: number;
  clientInstanceId: string;
  deviceEpoch: string | null;
  moduleVersion: string;
  timezone: string;
};

export type Delivery = {
  deliveryId: string;
  envelope: Envelope;
  records: IngestionRecord[];
  coverage: Coverage[];
};

/**
 * Ближайшая пачка к отправке.
 *
 * Однажды выданная, она сохраняется на диске и повторяется такой же: приёмник
 * узнаёт точный повтор и отвечает «уже принято», а изменённую пачку с тем же
 * идентификатором отклоняет как конфликт.
 */
export function nextDelivery(
  account: string,
  bandId: string,
  limits: BandLimits,
  envelope: Envelope,
): Promise<Delivery | null> {
  return serial(async () => {
    const stored = await load(account, bandId);
    const head = stored.pending[0];
    if (!head) return null;

    // Пачка не пересекает границу эпох: эпоха в ней одна, в конверте.
    const sameEpoch = stored.pending.findIndex((record) => record.epoch !== head.epoch);
    const candidates = sameEpoch === -1 ? stored.pending : stored.pending.slice(0, sameEpoch);

    const count = stored.delivery?.records ?? fittingCount(candidates, limits);
    if (count === 0) return null;

    const delivery = stored.delivery ?? {
      id: requestId(),
      records: count,
      coverage: stored.coverage,
      envelope: { ...envelope, deviceEpoch: head.epoch },
    };
    if (!stored.delivery) await save(account, bandId, { ...stored, delivery });

    return {
      deliveryId: delivery.id,
      // Конверт и окна замороженной пачки — те, с которыми её отправили в
      // первый раз. Служебные поля очереди наружу не уходят.
      envelope: delivery.envelope,
      records: stored.pending
        .slice(0, delivery.records)
        .map(({ epoch: _epoch, slot: _slot, ...record }) => record),
      coverage: delivery.coverage,
    };
  });
}

/**
 * Пачка принята: убрать её из очереди вместе с уехавшими окнами покрытия.
 *
 * Только с уехавшими. Пока пачка была в пути, дочитывание суток могло
 * добавить своё окно — оно ещё не отправлялось и обязано дождаться следующей.
 */
export function settle(account: string, bandId: string): Promise<void> {
  return serial(async () => {
    const stored = await load(account, bandId);
    const frozen = stored.delivery;
    if (!frozen) return;

    const sent = new Set(frozen.coverage.map(coverageKey));
    await save(account, bandId, {
      ...stored,
      pending: stored.pending.slice(frozen.records),
      coverage: stored.coverage.filter((window) => !sent.has(coverageKey(window))),
      delivery: null,
    });
  });
}

/**
 * Пачка не влезла в предел запроса. Режем пополам и берём новый идентификатор:
 * это уже другая доставка, и выдавать её за прежнюю нельзя.
 */
export function halveDelivery(account: string, bandId: string): Promise<boolean> {
  return serial(async () => {
    const stored = await load(account, bandId);
    const frozen = stored.delivery;
    if (!frozen || frozen.records <= 1) return false;

    await save(account, bandId, {
      ...stored,
      delivery: { ...frozen, id: requestId(), records: Math.floor(frozen.records / 2) },
    });
    return true;
  });
}

/**
 * Пачка стала неотправимой: сервер отверг её конверт целиком — например,
 * версия привязки на его стороне уже другая. Прежняя доставка мертва, и
 * повторять её нечем: снимаем заморозку, чтобы записи уехали заново под новым
 * именем и с новым конвертом. Состав записей при этом не меняется.
 */
export function unfreezeDelivery(account: string, bandId: string): Promise<void> {
  return serial(async () => {
    const stored = await load(account, bandId);
    if (stored.delivery) await save(account, bandId, { ...stored, delivery: null });
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
