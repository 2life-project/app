import AsyncStorage from '@react-native-async-storage/async-storage';

import type { BandLimits } from '../api';

import {
  clearOutbox,
  enqueue,
  halveDelivery,
  nextDelivery,
  requeue,
  settle,
  unfreezeDelivery,
  type Draft,
  type Envelope,
} from './outbox';

const ACCOUNT = 'user-1';
const BAND = 'band-1';

const LIMITS: BandLimits = {
  maxRecordsPerBatch: 2,
  maxBatchBytes: 512 * 1024,
  maxRecordBytes: 256 * 1024,
  audioPartBytes: 8 << 20,
  maxAudioBytes: 256 << 20,
};

const ENVELOPE: Envelope = {
  bindingVersion: 1,
  clientInstanceId: 'install-1',
  deviceEpoch: 'epoch-1',
  moduleVersion: '0.1.0',
  timezone: 'Europe/Moscow',
};

const KNOWN = { timeQuality: 'known' } as const;

function minute(at: string, steps: number): Draft {
  return {
    stream: 'activity_samples',
    key: `history|${at}`,
    at: new Date(at),
    payload: { at, source: 'history', steps },
  };
}

function summary(date: string, steps: number): Draft {
  return {
    stream: 'day_summaries',
    key: date,
    at: new Date(`${date}T12:00:00.000Z`),
    payload: { date, totals: { steps } },
  };
}

beforeEach(() => AsyncStorage.clear());

describe('очередь', () => {
  it('отдаёт поставленное и забывает после подтверждения', async () => {
    await enqueue(ACCOUNT, BAND, [minute('2026-09-10T09:00:00.000Z', 10)], KNOWN);

    const delivery = await nextDelivery(ACCOUNT, BAND, LIMITS, ENVELOPE);
    expect(delivery?.records).toHaveLength(1);
    expect(delivery?.records[0]?.payload).toEqual({
      at: '2026-09-10T09:00:00.000Z',
      source: 'history',
      steps: 10,
    });

    await settle(ACCOUNT, BAND);
    expect(await nextDelivery(ACCOUNT, BAND, LIMITS, ENVELOPE)).toBeNull();
  });

  // Раздел обновляют кнопкой, и история за сегодня приходит целиком каждый
  // раз. Без этого каждое обновление гнало бы на сервер весь день поминутно.
  it('не отправляет второй раз то, что уже уехало', async () => {
    const early = minute('2026-09-10T09:00:00.000Z', 10);
    await enqueue(ACCOUNT, BAND, [early], KNOWN);
    await settle(ACCOUNT, BAND);
    await nextDelivery(ACCOUNT, BAND, LIMITS, ENVELOPE);
    await settle(ACCOUNT, BAND);

    await enqueue(ACCOUNT, BAND, [early, minute('2026-09-10T09:01:00.000Z', 12)], KNOWN);

    const delivery = await nextDelivery(ACCOUNT, BAND, LIMITS, ENVELOPE);
    expect(delivery?.records).toHaveLength(1);
    expect(delivery?.records[0]?.payload).toMatchObject({ steps: 12 });
  });

  // Сутки читаются задом наперёд: сегодняшние первыми, пропущенные дни после
  // них. Общий курсор «докуда отправлено» отбросил бы их как старые.
  it('дочитанные вчерашние сутки не считаются устаревшими', async () => {
    await enqueue(ACCOUNT, BAND, [minute('2026-09-10T09:00:00.000Z', 10)], KNOWN);
    await enqueue(ACCOUNT, BAND, [minute('2026-09-09T09:00:00.000Z', 20)], KNOWN);

    const delivery = await nextDelivery(ACCOUNT, BAND, LIMITS, ENVELOPE);
    expect(delivery?.records).toHaveLength(2);
  });

  it('одно и то же событие уезжает под одним идентификатором', async () => {
    await enqueue(ACCOUNT, BAND, [minute('2026-09-10T09:00:00.000Z', 10)], KNOWN);
    const first = (await nextDelivery(ACCOUNT, BAND, LIMITS, ENVELOPE))?.records[0]?.eventId;

    await settle(ACCOUNT, BAND);
    await clearOutbox(ACCOUNT, BAND);
    await enqueue(ACCOUNT, BAND, [minute('2026-09-10T09:00:00.000Z', 10)], KNOWN);
    const second = (await nextDelivery(ACCOUNT, BAND, LIMITS, ENVELOPE))?.records[0]?.eventId;

    expect(first).toBe(second);
  });

  // Сводка за сегодня меняется весь день. Отправлять обе её версии значит
  // гнать заведомо устаревшую.
  it('снимок в очереди заменяется свежим, а не копится', async () => {
    await enqueue(ACCOUNT, BAND, [summary('2026-09-10', 100)], KNOWN);
    await enqueue(ACCOUNT, BAND, [summary('2026-09-10', 900)], KNOWN);

    const delivery = await nextDelivery(ACCOUNT, BAND, LIMITS, ENVELOPE);
    expect(delivery?.records).toHaveLength(1);
    expect(delivery?.records[0]?.payload).toMatchObject({ totals: { steps: 900 } });
  });
});

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

describe('разные аккаунты', () => {
  // Телефоном пользуются двое. Отправить накопленное одним от имени второго
  // значит записать ему чужие измерения.
  it('не видят очередей друг друга', async () => {
    await enqueue(ACCOUNT, BAND, [minute('2026-09-10T09:00:00.000Z', 10)], KNOWN);

    expect(await nextDelivery('user-2', BAND, LIMITS, ENVELOPE)).toBeNull();
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

describe('повторная отправка', () => {
  it('возвращает запись в очередь под тем же именем, но новым номером', async () => {
    await enqueue(ACCOUNT, BAND, [minute('2026-09-10T09:00:00.000Z', 10)], KNOWN);
    const first = await nextDelivery(ACCOUNT, BAND, LIMITS, ENVELOPE);
    await settle(ACCOUNT, BAND);

    await requeue(ACCOUNT, BAND, first?.records ?? [], 'epoch-1');
    const again = await nextDelivery(ACCOUNT, BAND, LIMITS, ENVELOPE);

    expect(again?.records[0]?.eventId).toBe(first?.records[0]?.eventId);
    expect(again?.records[0]?.sequence).toBeGreaterThan(first?.records[0]?.sequence ?? 0);
  });

  // Причина, которая не проходит трижды, временной не является: гонять
  // запись вечно — значит никогда не отправить то, что стоит за ней.
  it('после трёх кругов запись отбрасывается', async () => {
    await enqueue(ACCOUNT, BAND, [minute('2026-09-10T09:00:00.000Z', 10)], KNOWN);
    let delivery = await nextDelivery(ACCOUNT, BAND, LIMITS, ENVELOPE);

    for (let round = 0; round < 3; round += 1) {
      await settle(ACCOUNT, BAND);
      await requeue(ACCOUNT, BAND, delivery?.records ?? [], null);
      delivery = await nextDelivery(ACCOUNT, BAND, LIMITS, ENVELOPE);
    }

    expect(delivery).toBeNull();
  });
});

describe('битая очередь', () => {
  // На браслете этих суток уже нет: затереть их пустотой молча нельзя.
  it('откладывается под соседний ключ, а не затирается', async () => {
    const key = `2life:band-outbox.1:${ACCOUNT}:${BAND}`;
    await AsyncStorage.setItem(key, '{not json');

    await enqueue(ACCOUNT, BAND, [minute('2026-09-10T09:00:00.000Z', 10)], KNOWN);

    expect(await AsyncStorage.getItem(`${key}:broken`)).toBe('{not json');
    expect((await nextDelivery(ACCOUNT, BAND, LIMITS, ENVELOPE))?.records).toHaveLength(1);
  });
});
