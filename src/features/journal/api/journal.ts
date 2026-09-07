import { request } from '@/core/http/client';
import { requestId } from '@/shared/lib/id';

import type { CalendarEvent, CalendarEvents, CalendarMonth, Layer } from './contract';

/** Ручки журнала: месяц с индикаторами, события периода и отметка выполнения. */

const SCHEMA = '2';

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

export function fetchEvents(
  start: string,
  end: string,
  timeZone: string,
  layers: readonly Layer[],
  signal?: AbortSignal,
): Promise<CalendarEvents> {
  const path = `/api/v2/calendar/events?${query({
    schemaVersion: SCHEMA,
    start,
    end,
    timezone: timeZone,
    layers: layers.join(','),
  })}`;
  return request<CalendarEvents>(path, { signal });
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

export function eventKey(id: string, timeZone: string): string {
  return `event:${id}:${timeZone}`;
}

/** Подробности события: то, чего нет в списке — текст заметки, метки, источник. */
export function fetchEvent(
  id: string,
  timeZone: string,
  signal?: AbortSignal,
): Promise<CalendarEvent> {
  return request<CalendarEvent>(
    `/api/v2/journal/events/${encodeURIComponent(id)}?${query({ timezone: timeZone })}`,
    { signal },
  );
}
