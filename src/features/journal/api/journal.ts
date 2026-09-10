import { request } from '@/core/http/client';
import { requestId } from '@/shared/lib/id';

import type { CalendarEvent, CalendarEvents, CalendarMonth, Layer } from './contract';

/** Ручки журнала: месяц с индикаторами, события периода и отметка выполнения. */

const SCHEMA = '2';

/** Предел страницы событий — максимум, который принимает сервер. */
const PAGE = '200';

/**
 * Сколько страниц дочитывать. Пятьдесят страниц по двести — десять тысяч
 * событий за период; больше за неделю не бывает, а без предела курсор,
 * который сервер по ошибке вернул бы тем же, крутил бы запросы вечно.
 */
const MAX_PAGES = 50;

function query(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

export function monthKey(year: number, month: number, timeZone: string, layers: string): string {
  return `calendar:${year}-${month}:${timeZone}:${layers}`;
}

export function fetchMonth(
  year: number,
  month: number,
  timeZone: string,
  layers: readonly Layer[],
  signal?: AbortSignal,
): Promise<CalendarMonth> {
  const path = `/api/v2/calendar/month?${query({
    schemaVersion: SCHEMA,
    year: String(year),
    month: String(month),
    timezone: timeZone,
    layers: layers.join(','),
  })}`;
  return request<CalendarMonth>(path, { signal });
}

export function eventsKey(start: string, end: string, timeZone: string, layers: string): string {
  return `events:${start}:${end}:${timeZone}:${layers}`;
}

/**
 * События периода — все страницы. Первая страница — не весь день: сервер
 * режет ответ по двести событий и даёт курсор на следующую. Счётчики при
 * этом относятся ко всему периоду и приходят на каждой странице одинаковыми.
 */
export async function fetchEvents(
  start: string,
  end: string,
  timeZone: string,
  layers: readonly Layer[],
  signal?: AbortSignal,
): Promise<CalendarEvents> {
  const base = {
    schemaVersion: SCHEMA,
    start,
    end,
    timezone: timeZone,
    layers: layers.join(','),
    limit: PAGE,
  };

  let first: CalendarEvents | null = null;
  const events: CalendarEvent[] = [];
  let cursor: string | null = null;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const params = cursor === null ? base : { ...base, cursor };
    const chunk: CalendarEvents = await request<CalendarEvents>(
      `/api/v2/calendar/events?${query(params)}`,
      { signal },
    );
    first ??= chunk;
    events.push(...chunk.events);
    cursor = chunk.nextCursor;
    if (cursor === null) break;
  }

  // Первая страница не может отсутствовать: цикл делает хотя бы один запрос.
  return { ...(first as CalendarEvents), events, nextCursor: null };
}

/**
 * Отметка выполнения. `requestId` обязателен: повтор запроса после обрыва не
 * должен создать вторую отметку, а сервер отличает их только по нему.
 */
export function markDone(event: CalendarEvent, done: boolean): Promise<CalendarEvent> {
  return request<CalendarEvent>(`/api/v2/journal/events/${encodeURIComponent(event.id)}/done`, {
    method: 'POST',
    body: { requestId: requestId(), revision: event.revision, done },
  });
}

/** Подробности одного события живут в домене: их читает и Главная. */
export { eventKey, fetchEvent } from '@/shared/domain';
