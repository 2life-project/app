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
  login: (): Href => '/login',
  register: (): Href => '/register',
  /** Восстановление пароля по коду из письма. */
  reset: (): Href => '/reset',
  journal: (): Href => '/journal',
  body: (): Href => '/body',
  records: (): Href => '/records',
  /** Медкарта до первого документа: объясняет, с чего она начинается. */
  recordsIntro: (): Href => '/records-intro',
  protocols: (): Href => '/protocols',

  assistant: (): Href => '/assistant',
  settings: (): Href => '/settings',
  /** Браслет: привязка, показатели, записи. */
  device: (): Href => '/device',
  checkIn: (): Href => '/check-in',
  widgets: (): Href => '/widgets',

  /** Новая тренировка принимает день: браслет мог пропустить и вчерашнюю. */
  workout: (id: string, date?: string): Href =>
    date ? { pathname: '/workout/[id]', params: { id, date } } : `/workout/${id}`,
  meal: (id: string): Href => `/meal/${id}`,
  /** Добавление еды в конкретный приём пищи. */
  addFood: (meal: string): Href => `/meal/${meal}/add`,
  course: (id: string): Href => `/course/${id}`,
  metric: (id: string): Href => `/metric/${id}`,
  /** Панели: у каждой свой адрес, чтобы система показала её нативным шитом. */
  event: (id: string): Href => `/event/${encodeURIComponent(id)}`,
  measure: (subsystem: string): Href => `/measure/${subsystem}`,
  threads: (): Href => '/threads',
  lab: (id: string): Href => `/lab/${id}`,
  protocol: (id: string): Href => `/protocol/${id}`,
} as const;
