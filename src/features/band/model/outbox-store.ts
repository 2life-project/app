import AsyncStorage from '@react-native-async-storage/async-storage';

import { logger } from '@/core/log/logger';

import type { Coverage, IngestionRecord } from '../api';

/**
 * Хранилище очереди: одна запись AsyncStorage на пару «аккаунт и браслет».
 *
 * Здесь форма записей и правила, которые она закрепляет. Действия над
 * очередью — постановка и возврат — в `outbox.ts`, жизнь пачки — в
 * `outbox-delivery.ts`.
 */

const PREFIX = '2life:band-outbox.1:';

/** Что описывает пачку целиком, помимо самих записей. */
export type Envelope = {
  bindingVersion: number;
  clientInstanceId: string;
  deviceEpoch: string | null;
  moduleVersion: string;
  timezone: string;
};

/**
 * Запись в очереди помнит эпоху часов, под которой её прочитали. В пачке эпоха
 * одна на всех — она в конверте, — поэтому пачка режется на границе эпох:
 * данные, снятые до сброса часов устройства, нельзя выдать за снятые после.
 * Наружу эпоха не уходит.
 */
export type PendingRecord = IngestionRecord & {
  epoch: string | null;
  /** Поток и сутки: по ним свежий снимок замещает в очереди прежний. */
  slot?: string;
};

export type Stored = {
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
   * Сколько записей брать в следующую пачку после отказа. Без него каждая
   * отвергнутая запись стоила бы столько запросов, сколько раз полная пачка
   * делится пополам: после приёма половины следующая снова бралась целиком.
   * Растёт вдвое на каждом приёме и снимается, когда перестаёт ограничивать.
   */
  window?: number;
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
   * Какой снимок каждого слота приёмник уже получил: `поток|YYYY-MM-DD` →
   * `eventId`. Снимок не событие: он читается заново при каждом обновлении, и
   * без этой памяти неизменившаяся сводка дня уезжала бы снова под тем же
   * именем с новым временем чтения — а это для приёмника конфликт.
   */
  snapshots?: Record<string, string>;
  /**
   * Сколько раз запись уже уезжала заново: `eventId` → счёт. Отдельно от
   * самой записи, потому что на время пути её в очереди нет, а наружу счёт
   * уходить не должен.
   */
  retries?: Record<string, number>;
};

/** Функция, а не константа: массивы внутри не должны быть общими между чтениями. */
const empty = (): Stored => ({ sequence: 0, pending: [], coverage: [], delivery: null, seen: {} });

export function keyOf(account: string, bandId: string): string {
  return `${PREFIX}${account}:${bandId}`;
}

export async function load(account: string, bandId: string): Promise<Stored> {
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
    if (raw !== null) {
      await AsyncStorage.setItem(`${key}:broken`, raw).catch((reason: unknown) =>
        logger.error('band: копия битой очереди не сохранилась', { reason }),
      );
    }
    return empty();
  }
}

export async function save(account: string, bandId: string, next: Stored): Promise<void> {
  await AsyncStorage.setItem(keyOf(account, bandId), JSON.stringify(next));
}
