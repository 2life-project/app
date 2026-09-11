import type { Href } from 'expo-router';

import { to } from '@/shared/nav';

import type { WidgetType } from '../api/contract';

/**
 * Карточки без данных: пустая ячейка и «добавить виджет». Всё, что сервер
 * наполняет, рисуется своим виджетом — карточка со счётом и ссылкой «смотри
 * там» была бы отпиской при живом содержимом в ответе.
 */
export type SummaryView = {
  title: string;
  caption?: string;
  description: string;
  action: { label: string; href: Href };
};

export function summaryFor(widget: WidgetType): SummaryView | null {
  switch (widget) {
    case 'create':
    case 'empty':
      return {
        title: 'Add a widget',
        description: 'Pick what the home feed shows and in which order.',
        action: { label: 'Widgets', href: to.widgets() },
      };
    default:
      return null;
  }
}
