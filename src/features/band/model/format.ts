/**
 * Единый вид чисел и времени в разделе браслета.
 *
 * Раньше каждая карточка форматировала своё: часы печатались четырьмя разными
 * функциями, длительность — тремя, километры — двумя. Один и тот же замер
 * выглядел по-разному в карточке и в её же разборе.
 */

const MINUTES_PER_HOUR = 60;
const METRES_PER_KM = 1000;

/** Часы и минуты: `14:32`. */
export function clock(at: Date): string {
  return at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Дата с временем для списков: `9 сент., 16:39`. */
export function stamp(at: Date): string {
  return at.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Длительность из минут: `8 ч 20 мин`. */
export function duration(minutes: number): string {
  if (minutes < MINUTES_PER_HOUR) return `${minutes} мин`;

  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const rest = minutes % MINUTES_PER_HOUR;
  return rest === 0 ? `${hours} ч` : `${hours} ч ${rest} мин`;
}

/** Длительность из секунд для идущего занятия: `12:07`. */
export function stopwatch(seconds: number): string {
  const minutes = Math.floor(seconds / MINUTES_PER_HOUR);
  return `${minutes}:${String(seconds % MINUTES_PER_HOUR).padStart(2, '0')}`;
}

/** Подпись часа на оси: `14:00`. */
export function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

/** Метры в километры с одним знаком. */
export function kilometres(metres: number): string {
  return (Math.round((metres / METRES_PER_KM) * 10) / 10).toFixed(1);
}
