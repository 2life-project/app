/**
 * Ответы `/api/v2/calendar` и `/api/v2/journal`. Слои задаёт сервер — их
 * список здесь повторён именно его словами, чтобы фильтр в интерфейсе и
 * фильтр в запросе не разошлись.
 */
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

export type LayerCounts = Record<Layer, number>;

export type MonthDay = {
  date: string;
  total: number;
  planned: number;
  done: number;
  recorded: number;
  skipped: number;
  layers: LayerCounts;
  hasData: boolean;
  dataCount: number;
};

export type CalendarMonth = {
  schemaVersion: number;
  year: number;
  month: number;
  start: string;
  end: string;
  timezone: string;
  status: string;
  errors: readonly unknown[];
  counts: {
    total: number;
    planned: number;
    done: number;
    recorded: number;
    skipped: number;
    layers: LayerCounts;
  };
  days: readonly MonthDay[];
};

/**
 * Событие дня. `values` и `detail` у каждого вида свои и в контракте показаны
 * только для заметки — поэтому оставлены нетипизированными: придумать им
 * форму значит договориться с собой вместо сервера.
 */
export type CalendarEvent = {
  id: string;
  date: string;
  layer: Layer;
  kind: string;
  title: string;
  startAt: string | null;
  endAt: string | null;
  allDay: boolean;
  /** `planned` ждёт отметки, `done` и `recorded` уже случились. */
  status: 'planned' | 'done' | 'recorded' | 'skipped' | string;
  source: { name: string; kind: string; method: string };
  revision: string;
  values: readonly unknown[];
  detail: unknown;
  reference: { domain: string; id: string } | null;
  action: string | null;
};

export type CalendarEvents = {
  schemaVersion: number;
  start: string;
  end: string;
  timezone: string;
  layers: readonly Layer[];
  status: string;
  errors: readonly unknown[];
  counts: {
    total: number;
    planned: number;
    done: number;
    recorded: number;
    skipped: number;
    layers: LayerCounts;
  };
  events: readonly CalendarEvent[];
  nextCursor: string | null;
};
