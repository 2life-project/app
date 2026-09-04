/** Суб-навигация Главной — разделы ленты виджетов из макета. */
export const HOME_SECTIONS = [
  { value: 'overview', label: 'Обзор' },
  { value: 'activity', label: 'Активность' },
  { value: 'nutrition', label: 'Питание' },
  { value: 'supplements', label: 'Добавки' },
  { value: 'wellbeing', label: 'Самочувствие' },
] as const;

export type HomeSection = (typeof HOME_SECTIONS)[number]['value'];

/** Что появится в каждом разделе. Держим рядом, чтобы заглушка не врала. */
export const HOME_SECTION_NOTE: Record<HomeSection, string> = {
  overview: 'Четыре кольца, ближайшее событие, добавки на сегодня, решения.',
  activity: 'Нагрузка за день, тренировки, ручное добавление.',
  nutrition: 'Приёмы пищи за день, калории и макросы, добавление еды.',
  supplements: 'Курсы добавок, приёмы на сегодня, переход в список курсов.',
  wellbeing: 'Чек-ин самочувствия и его история.',
};

export function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 5) return 'Доброй ночи';
  if (hour < 12) return 'Доброе утро';
  if (hour < 18) return 'Добрый день';
  return 'Добрый вечер';
}
