import { request } from '@/core/http/client';
import { requestId } from '@/shared/lib/id';

import type { Decision, HomeData, HomeLayout, Surface, WidgetCatalog } from './contract';

/**
 * Ручки Главной. Здесь только адреса и параметры — разбор и смысл живут в
 * `model/`, чтобы форма ответа не растекалась по экранам.
 */

const SURFACE: Surface = 'mobile';

/** Ключ запроса для `useQuery`: он же полностью описывает, что грузим. */
export function homeKey(date: string, timeZone: string): string {
  return `home:${date}:${timeZone}`;
}

function query(params: Record<string, string>): string {
  return new URLSearchParams(params).toString();
}

export function fetchHomeLayout(signal?: AbortSignal): Promise<HomeLayout> {
  return request<HomeLayout>(`/api/v2/home/layout?${query({ surface: SURFACE })}`, { signal });
}

export function fetchHomeData(
  date: string,
  timeZone: string,
  signal?: AbortSignal,
): Promise<HomeData> {
  const path = `/api/v2/home/data?${query({ surface: SURFACE, date, timezone: timeZone })}`;
  return request<HomeData>(path, { signal });
}

export function fetchWidgetCatalog(signal?: AbortSignal): Promise<WidgetCatalog> {
  return request<WidgetCatalog>('/api/v2/widgets/catalog', { signal });
}

export function fetchDecisions(signal?: AbortSignal): Promise<{ items: readonly Decision[] }> {
  return request<{ items: readonly Decision[] }>('/api/v2/decisions', { signal });
}

/**
 * Решения версионируются: сервер принимает действие только против той ревизии,
 * которую видел клиент. Разошлись — значит решение уже изменили, и правильный
 * ответ пользователю «обновите», а не молча перетереть чужое действие.
 */
export function resolveDecision(
  decision: Decision,
  action: 'apply' | 'dismiss',
): Promise<Decision> {
  return request<Decision>(`/api/v2/decisions/${encodeURIComponent(decision.id)}/resolve`, {
    method: 'POST',
    body: {
      revision: decision.revision,
      sourceRevision: decision.sourceRevision,
      requestId: requestId(),
      action,
    },
  });
}

export function snoozeDecision(decision: Decision, until: string): Promise<Decision> {
  return request<Decision>(`/api/v2/decisions/${encodeURIComponent(decision.id)}/snooze`, {
    method: 'POST',
    body: {
      revision: decision.revision,
      sourceRevision: decision.sourceRevision,
      requestId: requestId(),
      until,
    },
  });
}

export function undoDecision(decision: Decision): Promise<Decision> {
  return request<Decision>(`/api/v2/decisions/${encodeURIComponent(decision.id)}/undo`, {
    method: 'POST',
    body: {
      revision: decision.revision,
      sourceRevision: decision.sourceRevision,
      requestId: requestId(),
    },
  });
}

/** Отметка приёма добавки, включая запланированный приём с Главной. */
export function markSupplementTaken(
  id: string,
  date: string,
  status: 'taken' | 'skipped',
): Promise<{ id: string; date: string; status: string; takenAt: number | null }> {
  return request(`/api/v2/supplements/checkins/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: { status, date },
  });
}
