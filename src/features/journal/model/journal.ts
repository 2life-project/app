import type { Tone } from '@/shared/theme';
import type { CalendarDay } from '@/shared/ui';

import { LAYERS, type CalendarEvent, type CalendarMonth, type Layer } from '../api/contract';

/**
 * Слои журнала: их состав задаёт сервер, а цвет — интерфейс. Цвет здесь
 * кодирует слой, а не состояние: событие бывает выполненным или нет
 * независимо от того, тренировка это или заметка.
 */
export const JOURNAL_LAYERS: readonly { id: Layer; tone: Tone; title: string }[] = [
  { id: 'workouts', tone: 'highlight', title: 'Workouts' },
  { id: 'nutrition', tone: 'success', title: 'Meals' },
  { id: 'intake', tone: 'accent', title: 'Supplements' },
  { id: 'practices', tone: 'accent', title: 'Practices' },
  { id: 'checkins', tone: 'neutral', title: 'Check-ins' },
  { id: 'symptoms', tone: 'warning', title: 'Symptoms' },
  { id: 'notes', tone: 'neutral', title: 'Notes' },
  { id: 'health', tone: 'danger', title: 'Health records' },
];

export const ALL_LAYERS = LAYERS;

/** Сколько записей за месяц у каждого слоя — подпись в списке слоёв. */
export function layerCount(month: CalendarMonth | null, layer: Layer): string {
  const total = month?.counts.layers[layer] ?? 0;
  return total === 1 ? '1 this month' : `${total} this month`;
}

/**
 * Точки под днём. Показываем не количество записей, а какие слои в этот день
 * были: три точки разных цветов говорят больше, чем «12».
 */
export function monthDays(month: CalendarMonth | null, shown: readonly Layer[]): CalendarDay[] {
  if (!month) return [];

  return month.days.map((day) => ({
    day: Number(day.date.slice(-2)),
    dots: JOURNAL_LAYERS.filter((layer) => shown.includes(layer.id) && day.layers[layer.id] > 0)
      .map((layer) => layer.tone)
      .slice(0, 3),
  }));
}

/** Время события или пометка «весь день»: без времени строка теряет смысл. */
export function eventTime(event: CalendarEvent): string {
  if (event.allDay || !event.startAt) return 'all day';
  return event.startAt.slice(11, 16);
}

export function isDone(event: CalendarEvent): boolean {
  return event.status === 'done' || event.status === 'recorded';
}

/** Что предлагаем добавить, когда за день ничего не записано. */
export const EMPTY_DAY = {
  title: 'Nothing logged this day',
  text: 'An empty day is a fact too — but if something was there, add it now while you remember.',
  quick: [
    { id: 'workout', icon: 'activity', title: 'A workout', subtitle: 'the band missed it' },
    { id: 'meal', icon: 'coffee', title: 'A meal', subtitle: 'photo or search' },
    { id: 'stack', icon: 'package', title: 'A stack', subtitle: 'morning, day or evening' },
    { id: 'note', icon: 'edit-3', title: 'A note', subtitle: 'voice or text' },
  ],
} as const;
