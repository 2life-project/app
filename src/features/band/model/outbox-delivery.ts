import { requestId } from '@/shared/lib/id';

import type { BandLimits, Coverage, IngestionRecord } from '../api';

import { coverageKey, fittingCount } from './outbox-pack';
import { load, save, type Envelope } from './outbox-store';
import { serial } from './serial';

/**
 * Жизнь пачки: выдать, подтвердить, поделить пополам, снять заморозку.
 * Что такое заморозка и зачем она — у формы очереди в `outbox-store.ts`.
 */

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

    const fitting = fittingCount(candidates, limits);
    const window =
      stored.window !== undefined && stored.window < fitting ? stored.window : undefined;
    const count = stored.delivery?.records ?? window ?? fitting;
    if (count === 0) return null;

    const delivery = stored.delivery ?? {
      id: requestId(),
      records: count,
      coverage: stored.coverage,
      envelope: { ...envelope, deviceEpoch: head.epoch },
    };
    if (!stored.delivery) await save(account, bandId, { ...stored, delivery, window });

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
export function settle(
  account: string,
  bandId: string,
  outcome: 'accepted' | 'dropped' = 'accepted',
): Promise<void> {
  return serial(async () => {
    const stored = await load(account, bandId);
    const frozen = stored.delivery;
    if (!frozen) return;

    const sent = new Set(frozen.coverage.map(coverageKey));
    // Снимки уехавшей пачки приёмник получил — принял или отверг, — и второй
    // раз с тем же содержимым их слать нельзя.
    const snapshots = { ...stored.snapshots };
    for (const record of stored.pending.slice(0, frozen.records)) {
      if (record.slot) snapshots[record.slot] = record.eventId;
    }
    await save(account, bandId, {
      ...stored,
      pending: stored.pending.slice(frozen.records),
      coverage: stored.coverage.filter((range) => !sent.has(coverageKey(range))),
      delivery: null,
      snapshots,
      // Отброшенный виновник — не приём: окно после него не растёт, иначе в
      // сплошь отвергаемой очереди каждая запись снова стоила бы три запроса.
      window:
        stored.window !== undefined && outcome === 'accepted' ? stored.window * 2 : stored.window,
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

    const records = Math.floor(frozen.records / 2);
    await save(account, bandId, {
      ...stored,
      delivery: { ...frozen, id: requestId(), records },
      window: records,
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
