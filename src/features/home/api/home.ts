import { request } from '@/core/http/client';
import { requestId } from '@/shared/lib/id';

import type {
  Decision,
  HomeData,
  HomeLayout,
  LayoutCell,
  PlanItem,
  Surface,
  WidgetCatalog,
  WidgetRecipe,
} from './contract';

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

/**
 * Сохранение раскладки. Ревизия обязательна: сервер не примет запись поверх
 * той, которую человек поменял с другого устройства, — и это правильно.
 */
export function saveHomeLayout(
  current: HomeLayout,
  cells: readonly LayoutCell[],
): Promise<HomeLayout> {
  return request<HomeLayout>(`/api/v2/home/layout?${query({ surface: SURFACE })}`, {
    method: 'PUT',
    body: {
      schemaVersion: current.schemaVersion,
      revision: current.revision,
      layout: {
        dockWidth: current.layout.dockWidth,
        columns: [{ id: 'mobile-main', size: 1, cells: cells.map((cell) => ({ ...cell })) }],
      },
    },
  });
}

export function fetchWidgetCatalog(signal?: AbortSignal): Promise<WidgetCatalog> {
  return request<WidgetCatalog>('/api/v2/widgets/catalog', { signal });
}

/**
 * Собрать рецепт виджета по описанию словами. Сервер отвечает черновиком и
 * раскладку не трогает: рецепт становится виджетом только после того, как
 * человек его подтвердил и ячейка сохранена в раскладке.
 */
export function composeWidget(prompt: string): Promise<{ recipe: WidgetRecipe; saved: boolean }> {
  return request<{ recipe: WidgetRecipe; saved: boolean }>('/api/v2/widgets/compose', {
    method: 'POST',
    body: { prompt },
  });
}

/**
 * Отметить приём добавки. Адрес, метод и тело даёт сам пункт плана: сервер
 * называет действие, а клиент его выполняет, не собирая адрес по памяти.
 * Пункты без действия отмечаются в своих разделах — их здесь не трогают.
 */
export function markPlanItem(
  item: PlanItem,
  status: 'taken' | 'skipped' | 'pending',
): Promise<unknown> {
  const action = item.action;
  if (!action) return Promise.reject(new Error(`plan item ${item.id} has no action`));

  return request(pathOf(action.url), {
    method: action.method,
    body: { ...action.body, status },
  });
}

/** Адрес действия может прийти полным: клиент ходит только на свой сервер. */
function pathOf(url: string): string {
  return url.startsWith('/') ? url : new URL(url).pathname + new URL(url).search;
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
/** Применение выбранных пунктов решения — сервер разрешает это отдельно от «применить всё». */
export function applyDecisionItems(
  decision: Decision,
  itemIds: readonly string[],
): Promise<Decision> {
  return request<Decision>(`/api/v2/decisions/${encodeURIComponent(decision.id)}/items`, {
    method: 'POST',
    body: {
      revision: decision.revision,
      sourceRevision: decision.sourceRevision,
      requestId: requestId(),
      itemIds: [...itemIds],
    },
  });
}
