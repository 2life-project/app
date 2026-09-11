import AsyncStorage from '@react-native-async-storage/async-storage';

import { enqueue } from './outbox';
import { halveDelivery, nextDelivery, settle, unfreezeDelivery } from './outbox-delivery';
import { ACCOUNT, BAND, ENVELOPE, KNOWN, LIMITS, minute, summary } from './outbox.fixtures';

beforeEach(() => AsyncStorage.clear());

describe('замороженная пачка', () => {
  it('повторяется тем же составом и тем же конвертом', async () => {
    await enqueue(ACCOUNT, BAND, [minute('2026-09-10T09:00:00.000Z', 10)], KNOWN);
    const first = await nextDelivery(ACCOUNT, BAND, LIMITS, ENVELOPE);

    // Пока пачка была в пути, прочиталось ещё и изменилась версия привязки.
    await enqueue(ACCOUNT, BAND, [minute('2026-09-10T09:01:00.000Z', 12)], KNOWN);
    const again = await nextDelivery(ACCOUNT, BAND, LIMITS, { ...ENVELOPE, bindingVersion: 7 });

    expect(again?.deliveryId).toBe(first?.deliveryId);
    expect(again?.records).toEqual(first?.records);
    expect(again?.envelope.bindingVersion).toBe(1);
  });

  it('делится пополам под новым именем, когда не влезла в запрос', async () => {
    await enqueue(
      ACCOUNT,
      BAND,
      [minute('2026-09-10T09:00:00.000Z', 10), minute('2026-09-10T09:01:00.000Z', 12)],
      KNOWN,
    );
    const first = await nextDelivery(ACCOUNT, BAND, LIMITS, ENVELOPE);
    expect(first?.records).toHaveLength(2);

    expect(await halveDelivery(ACCOUNT, BAND)).toBe(true);
    const halved = await nextDelivery(ACCOUNT, BAND, LIMITS, ENVELOPE);
    expect(halved?.records).toHaveLength(1);
    expect(halved?.deliveryId).not.toBe(first?.deliveryId);

    // Одну запись делить уже некуда: дальше решает вызывающий.
    expect(await halveDelivery(ACCOUNT, BAND)).toBe(false);
  });

  // Пока пачка ездила, чтение поставило то же событие следом: после снятия
  // заморозки оба попали бы в одну пачку, а дубль приёмник не принимает.
  it('событие из замороженной пачки второй раз не ставится', async () => {
    await enqueue(ACCOUNT, BAND, [summary('2026-09-10', 100)], KNOWN);
    await nextDelivery(ACCOUNT, BAND, LIMITS, ENVELOPE);
    await enqueue(ACCOUNT, BAND, [summary('2026-09-10', 100)], KNOWN);
    await unfreezeDelivery(ACCOUNT, BAND);

    const delivery = await nextDelivery(ACCOUNT, BAND, LIMITS, ENVELOPE);

    expect(delivery?.records).toHaveLength(1);
  });

  it('снятая заморозка отдаёт те же записи под новым конвертом', async () => {
    await enqueue(ACCOUNT, BAND, [minute('2026-09-10T09:00:00.000Z', 10)], KNOWN);
    const first = await nextDelivery(ACCOUNT, BAND, LIMITS, ENVELOPE);

    await unfreezeDelivery(ACCOUNT, BAND);
    const next = await nextDelivery(ACCOUNT, BAND, LIMITS, { ...ENVELOPE, bindingVersion: 7 });

    expect(next?.deliveryId).not.toBe(first?.deliveryId);
    expect(next?.envelope.bindingVersion).toBe(7);
    expect(next?.records[0]?.eventId).toBe(first?.records[0]?.eventId);
  });
});

describe('окно после отказа', () => {
  const WIDE = { ...LIMITS, maxRecordsPerBatch: 8 };

  it('после отказа пачка растёт от одной записи, удваиваясь на приёмах', async () => {
    const drafts = Array.from({ length: 8 }, (_, i) => minute(`2026-09-10T09:0${i}:00.000Z`, i));
    await enqueue(ACCOUNT, BAND, drafts, KNOWN);
    expect((await nextDelivery(ACCOUNT, BAND, WIDE, ENVELOPE))?.records).toHaveLength(8);

    // Приёмник отвергает, пока виновник не останется один: 8 → 4 → 2 → 1.
    while (await halveDelivery(ACCOUNT, BAND));
    await settle(ACCOUNT, BAND, 'dropped');

    expect((await nextDelivery(ACCOUNT, BAND, WIDE, ENVELOPE))?.records).toHaveLength(1);
    await settle(ACCOUNT, BAND);
    expect((await nextDelivery(ACCOUNT, BAND, WIDE, ENVELOPE))?.records).toHaveLength(2);
    await settle(ACCOUNT, BAND);
    expect((await nextDelivery(ACCOUNT, BAND, WIDE, ENVELOPE))?.records).toHaveLength(4);
  });
});

describe('эпоха часов', () => {
  // Данные, снятые до сброса часов устройства, лежат на другой шкале времени.
  // Эпоха в пачке одна — в конверте, — поэтому пачка обязана кончиться там,
  // где кончается эпоха, а не выдать старое за новое.
  it('пачка не пересекает границу эпох и несёт эпоху своих записей', async () => {
    await enqueue(ACCOUNT, BAND, [minute('2026-09-10T09:00:00.000Z', 10)], {
      ...KNOWN,
      epoch: 'before-reset',
    });
    await enqueue(ACCOUNT, BAND, [minute('2026-09-10T09:01:00.000Z', 12)], {
      ...KNOWN,
      epoch: 'after-reset',
    });

    const first = await nextDelivery(ACCOUNT, BAND, LIMITS, ENVELOPE);
    expect(first?.records).toHaveLength(1);
    expect(first?.envelope.deviceEpoch).toBe('before-reset');
    expect(first?.records[0]).not.toHaveProperty('epoch');

    await settle(ACCOUNT, BAND);
    const second = await nextDelivery(ACCOUNT, BAND, LIMITS, ENVELOPE);
    expect(second?.envelope.deviceEpoch).toBe('after-reset');
  });
});

describe('окна покрытия', () => {
  const window = (day: string) => ({
    stream: 'activity_samples' as const,
    from: `${day}T00:00:00.000Z`,
    to: `${day}T23:59:00.000Z`,
    complete: true,
  });

  // Пока пачка в пути, дочитывание суток кладёт своё окно. Подтверждение
  // пачки обязано снять только уехавшие окна — иначе новое пропадает, и
  // сервер никогда не узнает, что эти сутки прочитаны целиком.
  it('подтверждение снимает только уехавшие окна', async () => {
    await enqueue(ACCOUNT, BAND, [minute('2026-09-10T09:00:00.000Z', 10)], {
      ...KNOWN,
      coverage: [window('2026-09-10')],
    });
    const first = await nextDelivery(ACCOUNT, BAND, LIMITS, ENVELOPE);
    expect(first?.coverage).toHaveLength(1);

    await enqueue(ACCOUNT, BAND, [minute('2026-09-09T09:00:00.000Z', 20)], {
      ...KNOWN,
      coverage: [window('2026-09-09')],
    });
    await settle(ACCOUNT, BAND);

    const next = await nextDelivery(ACCOUNT, BAND, LIMITS, ENVELOPE);
    expect(next?.coverage).toEqual([window('2026-09-09')]);
  });
});
