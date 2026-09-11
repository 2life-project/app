import { request, searchParams } from '@/core/http/client';
import { requestId } from '@/shared/lib/id';

/**
 * Событие журнала: то, что человек сделал или собирается сделать за день.
 *
 * Живёт здесь, потому что читателей двое: Журнал показывает событие в
 * календаре, а Главная открывает тренировку из ленты — и это одна и та же
 * ручка. Фича фиче не видна, поэтому общая форма и запросы лежат в домене.
 */

/** Слои задаёт сервер — список повторён его словами, чтобы фильтры сошлись. */
export const LAYERS = [
  'workouts',
  'nutrition',
  'intake',
  'practices',
  'checkins',
  'symptoms',
  'notes',
  'health',
] as const;

export type Layer = (typeof LAYERS)[number];

/** Измеренное в событии: длительность, калории, дистанция — что есть. */
export type EventValue = {
  key: string;
  value: string | number | null;
  unit?: string;
  scale?: { minimum: number; maximum: number };
};

/**
 * `detail` у каждого вида свой, и типизирована только та часть, которую экраны
 * читают. Остального в форме нет намеренно: придумать поля значит договориться
 * с собой вместо сервера.
 */
export type EventDetail = {
  text?: string;
  tags?: readonly string[];
  typeKey?: string | null;
  note?: string | null;
};

export type JournalEvent = {
  id: string;
  date: string;
  layer: Layer;
  kind: string;
  /** Заголовка сервер не отдаёт: строка называется по виду — см. `eventTitle`. */
  title?: string;
  startAt: string | null;
  endAt: string | null;
  allDay: boolean;
  /** `planned` ждёт отметки, `done` и `recorded` уже случились. */
  status: 'planned' | 'done' | 'recorded' | 'skipped' | string;
  source: { name: string; kind: string; method: string };
  revision: string;
  values: readonly EventValue[];
  detail: EventDetail | null;
  reference: { domain: string; id: string } | null;
  /** Готовое действие над событием, если сервер его даёт: метод, адрес, тело. */
  action: { method: string; url: string; body: Record<string, unknown> } | null;
};

/** Как назвать событие: своим заголовком, если он есть, иначе видом словами. */
export function eventTitle(event: Pick<JournalEvent, 'title' | 'kind'>): string {
  return event.title?.trim() || event.kind.replace(/[_.]/g, ' ');
}

export function eventKey(id: string, timeZone: string): string {
  return `event:${id}:${timeZone}`;
}

/** Подробности события: то, чего нет в списке — текст, метки, измеренное. */
export function fetchEvent(
  id: string,
  timeZone: string,
  signal?: AbortSignal,
): Promise<JournalEvent> {
  const query = searchParams({ timezone: timeZone });
  return request<JournalEvent>(`/api/v2/journal/events/${encodeURIComponent(id)}?${query}`, {
    signal,
  });
}

/**
 * Что можно записать. У каждого вида свои обязательные поля — это не восемь
 * значений для одного произвольного тела. Здесь только те виды, которые
 * приложение действительно создаёт; остальные добавятся с первым экраном.
 */
export type EventInput =
  | {
      kind: 'workout';
      typeKey: string;
      durationMinutes: number;
      caloriesKcal?: number;
      distanceMeter?: number;
    }
  | { kind: 'note'; text: string; tags?: readonly string[] };

export type NewEvent = {
  startAt: string;
  timezone: string;
  note?: string;
  event: EventInput;
};

export type CreatedEvent = {
  requestId: string;
  id: string;
  date: string;
  timezone: string;
  references: readonly { domain: string; id: string }[];
};

/**
 * Записать событие. `requestId` обязателен: клиент повторяет запрос после
 * продления ключа, а человек может нажать дважды — без ключа идемпотентности
 * это две одинаковые записи в дне.
 */
export function createEvent(input: NewEvent): Promise<CreatedEvent> {
  return request<CreatedEvent>('/api/v2/journal/events', {
    method: 'POST',
    body: { requestId: requestId(), ...input },
  });
}
