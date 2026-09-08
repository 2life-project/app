import type { WidgetType } from '../api/contract';

/**
 * Человеческие имена типов виджетов. Сервер отдаёт ключи (`vitals`, `rails`),
 * и показывать их как есть значило бы говорить с человеком на языке схемы.
 */
export const WIDGET_TITLES: Partial<Record<WidgetType, string>> = {
  vitals: 'Four rings',
  now: 'Next up',
  meds: 'Supplements',
  rails: 'The plan',
  recover: 'Recovery',
  fuel: 'Fuel',
  move: 'Movement',
  decisions: 'Decisions',
  goals: 'Protocols and goals',
  streams: 'Live streams',
  create: 'Add a widget',
  empty: 'Empty slot',
  custom: 'Custom widget',
};

export const WIDGETS_NOTE =
  'The order here is the order on Home — the server keeps it, so the phone and the web agree. Turning a widget off hides it; the data behind it stays.';
