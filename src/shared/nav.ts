import type { Href } from 'expo-router';

/**
 * Адреса экранов в одном месте. Фича вызывает `router.push(to.workout(id))`
 * и не знает URL: переименование маршрута правится здесь, а не в пятнадцати
 * местах, и опечатка в пути ловится компилятором, а не на устройстве.
 *
 * Строковый литерал в `router.push` запрещён линтером.
 */
export const to = {
  home: (): Href => '/',
  journal: (): Href => '/journal',
  body: (): Href => '/body',
  records: (): Href => '/records',
  protocols: (): Href => '/protocols',

  assistant: (): Href => '/assistant',
  settings: (): Href => '/settings',
  device: (): Href => '/device',
  checkIn: (): Href => '/check-in',
  widgets: (): Href => '/widgets',

  workout: (id: string): Href => `/workout/${id}`,
  meal: (id: string): Href => `/meal/${id}`,
  course: (id: string): Href => `/course/${id}`,
  metric: (id: string): Href => `/metric/${id}`,
  lab: (id: string): Href => `/lab/${id}`,
  protocol: (id: string): Href => `/protocol/${id}`,
} as const;
