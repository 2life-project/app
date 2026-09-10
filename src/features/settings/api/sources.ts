import { request } from '@/core/http/client';

/**
 * Сторонние источники данных. У каждого своя ручка состояния и своя форма
 * ответа, поэтому читаются по одному, а разница форм гасится здесь: экрану
 * нужны три вещи — подключён ли, когда синхронизировался, что насчитал.
 *
 * Подключение идёт через OAuth в браузере с сессией веб-приложения: ручка
 * `connect` отвечает переадресацией и требует сессию, которой у внешнего
 * браузера нет. Поэтому телефон показывает состояние, а подключает веб.
 */
export type SourceId = 'whoop' | 'oura' | 'withings' | 'apple-health' | 'google-health';

export type SourceStatus = {
  id: SourceId;
  connected: boolean;
  /** Миллисекунды; `null`, когда синхронизации ещё не было или её не называют. */
  lastSyncedAt: number | null;
  /** Что сервер насчитал от источника — по его же именам. */
  counts: Record<string, number>;
  /** Состояние не прочиталось: не «отключён», а «неизвестно». */
  unknown?: boolean;
};

type Whoop = {
  connected: boolean;
  lastSyncedAt?: number | null;
  counts?: Record<string, number>;
};
type Withings = {
  connected: boolean;
  lastSyncedAt?: string | null;
  counts?: Record<string, number>;
};
type Streams = { connected: boolean; streams: readonly string[] };
type AppleHealth = {
  counts: Record<string, number>;
  latestWebhook: { completed_at: number | null } | null;
  latestImport: { completed_at: number | null } | null;
};

const millis = (value: string | number | null | undefined): number | null => {
  if (value === null || value === undefined) return null;
  const at = new Date(value).getTime();
  return Number.isNaN(at) ? null : at;
};

const READERS: Record<SourceId, (signal?: AbortSignal) => Promise<SourceStatus>> = {
  whoop: async (signal) => {
    const status = await request<Whoop>('/api/whoop/status', { signal });
    return {
      id: 'whoop',
      connected: status.connected,
      lastSyncedAt: millis(status.lastSyncedAt),
      counts: status.counts ?? {},
    };
  },
  withings: async (signal) => {
    const status = await request<Withings>('/api/withings/status', { signal });
    return {
      id: 'withings',
      connected: status.connected,
      lastSyncedAt: millis(status.lastSyncedAt),
      counts: status.counts ?? {},
    };
  },
  oura: async (signal) => {
    const status = await request<Streams>('/api/data-sources/oura/status', { signal });
    return { id: 'oura', connected: status.connected, lastSyncedAt: null, counts: {} };
  },
  'google-health': async (signal) => {
    const status = await request<Streams>('/api/data-sources/google-health/status', { signal });
    return { id: 'google-health', connected: status.connected, lastSyncedAt: null, counts: {} };
  },
  'apple-health': async (signal) => {
    const status = await request<AppleHealth>('/api/apple-health/status', { signal });
    const total = Object.values(status.counts).reduce((sum, count) => sum + count, 0);
    // У Apple Health нет «подключено»: данные приходят выгрузками. Считаем
    // источник живым, если хоть что-то от него уже есть.
    return {
      id: 'apple-health',
      connected: total > 0,
      lastSyncedAt: millis(status.latestWebhook?.completed_at ?? status.latestImport?.completed_at),
      counts: status.counts,
    };
  },
};

export const SOURCE_IDS = Object.keys(READERS) as SourceId[];

/**
 * Состояние всех источников разом. Один недоступный не роняет остальные:
 * его строка показывает «неизвестно», а не пропадает и не притворяется
 * отключённой.
 */
export async function fetchSources(signal?: AbortSignal): Promise<SourceStatus[]> {
  const settled = await Promise.allSettled(SOURCE_IDS.map((id) => READERS[id](signal)));

  return settled.map((result, index) =>
    result.status === 'fulfilled'
      ? result.value
      : {
          id: SOURCE_IDS[index] ?? 'whoop',
          connected: false,
          lastSyncedAt: null,
          counts: {},
          unknown: true,
        },
  );
}

/** Язык интерфейса хранится в аккаунте, а не на телефоне: он общий с вебом. */
export type Locale = 'ru' | 'en';

export function fetchLanguage(signal?: AbortSignal): Promise<{ locale: Locale }> {
  return request<{ locale: Locale }>('/api/settings/language', { signal });
}

export function saveLanguage(locale: Locale): Promise<{ locale: Locale }> {
  return request<{ locale: Locale }>('/api/settings/language', {
    method: 'POST',
    body: { locale },
  });
}
