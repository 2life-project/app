import type { JournalEvent, Layer } from '@/shared/domain';

/**
 * Ответы `/api/v2/calendar`. Само событие и слои живут в домене: их читает
 * ещё и Главная, открывая тренировку из ленты.
 */
export { LAYERS, type Layer } from '@/shared/domain';

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

export type { JournalEvent as CalendarEvent } from '@/shared/domain';

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
  events: readonly JournalEvent[];
  nextCursor: string | null;
};
