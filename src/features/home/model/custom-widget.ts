import type { MetricValue } from '@/shared/domain';

import type { WidgetRecipe } from '../api/contract';

/**
 * Пользовательский виджет. Форму его данных сервер не описывает, а `data` у
 * виджета своя на каждый тип — у `create` и `empty` там вообще `null`. Поэтому
 * рецепт и значения не берутся на веру: экран рисует виджет, только когда
 * сервер прислал и то, и другое. Иначе человек получал бы падение приложения
 * вместо карточки, которую он сам же и добавил.
 */
export type CustomWidgetView = { recipe: WidgetRecipe; metrics: readonly MetricValue[] };

const KINDS = new Set<WidgetRecipe['kind']>(['metric', 'line', 'bar', 'list']);

function isRecipe(value: unknown): value is WidgetRecipe {
  if (typeof value !== 'object' || value === null) return false;
  const { kind, metrics } = value as { kind?: unknown; metrics?: unknown };
  return KINDS.has(kind as WidgetRecipe['kind']) && Array.isArray(metrics);
}

export function customWidgetOf(data: unknown): CustomWidgetView | null {
  if (typeof data !== 'object' || data === null) return null;

  const { recipe, metrics } = data as { recipe?: unknown; metrics?: unknown };
  if (!isRecipe(recipe) || !Array.isArray(metrics)) return null;

  return { recipe, metrics: metrics as readonly MetricValue[] };
}
