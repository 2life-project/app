import type { Href } from 'expo-router';

import { to } from '@/shared/nav';

import type { HomeData, WidgetType } from '../api/contract';

/**
 * Виджеты, чьи данные сервер пока отдаёт пустыми массивами: `plan.items`,
 * `goals.data`, `streams`. Их состав в контракте не показан, поэтому строки
 * рисовать не из чего — но количество известно, и оно уже что-то говорит.
 * Такая карточка честна: она называет число и ведёт туда, где данные лежат.
 */
export type SummaryView = {
  title: string;
  caption?: string;
  description: string;
  action: { label: string; href: Href };
};

function count(total: number, one: string, many: string): string {
  return `${total} ${total === 1 ? one : many}`;
}

export function summaryFor(widget: WidgetType, home: HomeData): SummaryView | null {
  switch (widget) {
    case 'rails': {
      const { done, total } = home.plan;
      return {
        title: 'The plan',
        caption: total > 0 ? `${done} done · ${total - done} left today` : undefined,
        description:
          total > 0 ? 'Open the journal to work through the day.' : 'Nothing planned for today.',
        action: { label: 'Journal', href: to.journal() },
      };
    }
    case 'now':
      return {
        title: 'Next up',
        description:
          home.plan.total > 0
            ? 'The next item of the day waits in the journal.'
            : 'Nothing scheduled for the rest of the day.',
        action: { label: 'Journal', href: to.journal() },
      };
    case 'meds':
      return {
        title: 'Supplements',
        description: 'Courses and today’s doses live in the supplements section.',
        action: { label: 'Courses', href: to.course('all') },
      };
    case 'goals': {
      const goals = home.goals.data ?? [];
      return {
        title: 'Protocols and goals',
        caption: goals.length > 0 ? count(goals.length, 'goal', 'goals') : undefined,
        description:
          goals.length > 0 ? 'Progress by goal is on the protocols screen.' : 'No goals set yet.',
        action: { label: 'Protocols', href: to.protocols() },
      };
    }
    case 'streams': {
      const streams = home.streams;
      return {
        title: 'Live streams',
        caption: streams.length > 0 ? count(streams.length, 'stream', 'streams') : undefined,
        description:
          streams.length > 0
            ? 'Live values are read from the connected device.'
            : 'No device is streaming right now.',
        action: { label: 'Device', href: to.device() },
      };
    }
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
