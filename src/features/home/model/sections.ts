/** Суб-навигация Главной — разделы ленты виджетов из макета. */
export const HOME_SECTIONS = [
  { value: 'overview', label: 'Overview' },
  { value: 'activity', label: 'Activity' },
  { value: 'nutrition', label: 'Nutrition' },
  { value: 'supplements', label: 'Supplements' },
  { value: 'wellbeing', label: 'Wellbeing' },
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

/**
 * Лента виджетов Обзора — состав и порядок из макета. Пока это заглушки: у
 * каждой есть имя и строка о том, что она покажет, когда её соберут.
 */
export const HOME_WIDGETS = [
  { id: 'rings', title: 'Четыре кольца', note: 'Восстановление, топливо, нагрузка, приёмы' },
  { id: 'next', title: 'Ближайшее', note: 'Следующее событие дня и вход в него' },
  { id: 'supplements', title: 'Добавки', note: 'Приёмы на сегодня и прогресс курса' },
  { id: 'plan', title: 'План', note: 'Что запланировано на день' },
  { id: 'recovery', title: 'Восстановление', note: 'Сон и готовность к нагрузке' },
  { id: 'heart', title: 'Сердце', note: 'Пульс, вариабельность, давление' },
  { id: 'breathing', title: 'Дыхание', note: 'Насыщение кислородом и частота дыхания' },
  { id: 'composition', title: 'Состав тела', note: 'Вес и состав за период' },
  { id: 'protocols', title: 'Протоколы и цели', note: 'Активные протоколы и прогресс по целям' },
  { id: 'streams', title: 'Трансляции', note: 'Живые данные с устройства' },
] as const;

export function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 5) return 'Доброй ночи';
  if (hour < 12) return 'Доброе утро';
  if (hour < 18) return 'Добрый день';
  return 'Добрый вечер';
}
