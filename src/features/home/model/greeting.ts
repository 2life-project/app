/** Приветствие по местному времени. Чистая функция — время приходит аргументом. */
export function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 5) return 'Доброй ночи';
  if (hour < 12) return 'Доброе утро';
  if (hour < 18) return 'Добрый день';
  return 'Добрый вечер';
}
