import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearOutbox, enqueue, requeue } from './outbox';
import { nextDelivery, settle, unfreezeDelivery } from './outbox-delivery';
import { ACCOUNT, BAND, ENVELOPE, KNOWN, LIMITS, minute, summary } from './outbox.fixtures';

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

  // Приёмник отвергает записи с незнакомыми полями целой пачкой.
  it('служебные поля очереди наружу не уходят', async () => {
    await enqueue(ACCOUNT, BAND, [summary('2026-09-10', 100)], { ...KNOWN, epoch: 'e' });
    const record = (await nextDelivery(ACCOUNT, BAND, LIMITS, ENVELOPE))?.records[0];

    expect(Object.keys(record ?? {}).sort()).toEqual([
      'capturedAt',
      'eventId',
      'payload',
      'sequence',
      'stream',
      'timeQuality',
    ]);
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
  // гнать заведомо устаревшую — а под одним именем приёмник их и не примет:
  // содержимое принятого события менять нельзя.
  it('снимок в очереди заменяется свежим и получает своё имя', async () => {
    await enqueue(ACCOUNT, BAND, [summary('2026-09-10', 100)], KNOWN);
    const first = (await nextDelivery(ACCOUNT, BAND, LIMITS, ENVELOPE))?.records[0];
    await unfreezeDelivery(ACCOUNT, BAND);

    await enqueue(ACCOUNT, BAND, [summary('2026-09-10', 900)], KNOWN);
    const delivery = await nextDelivery(ACCOUNT, BAND, LIMITS, ENVELOPE);

    expect(delivery?.records).toHaveLength(1);
    expect(delivery?.records[0]?.payload).toMatchObject({ totals: { steps: 900 } });
    expect(delivery?.records[0]?.eventId).not.toBe(first?.eventId);
  });

  it('тот же снимок второй раз не ставится', async () => {
    await enqueue(ACCOUNT, BAND, [summary('2026-09-10', 100)], KNOWN);
    await enqueue(ACCOUNT, BAND, [summary('2026-09-10', 100)], KNOWN);

    const delivery = await nextDelivery(ACCOUNT, BAND, LIMITS, ENVELOPE);
    expect(delivery?.records).toHaveLength(1);
    expect(delivery?.records[0]?.sequence).toBe(1);
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

  it('не ставит запись повторно, если свежее чтение уже вернуло её в очередь', async () => {
    await enqueue(ACCOUNT, BAND, [summary('2026-09-10', 100)], KNOWN);
    const first = await nextDelivery(ACCOUNT, BAND, LIMITS, ENVELOPE);
    await settle(ACCOUNT, BAND);
    await enqueue(ACCOUNT, BAND, [summary('2026-09-10', 100)], KNOWN);

    // Эпоха та же, что у свежей записи: иначе их развела бы граница эпох.
    await requeue(ACCOUNT, BAND, first?.records ?? [], null);
    const again = await nextDelivery(ACCOUNT, BAND, LIMITS, ENVELOPE);

    expect(again?.records).toHaveLength(1);
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
