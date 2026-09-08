import type { Tone } from '@/shared/theme';

import { STATUS_TONE, type Biochemistry, type Marker, type Observation } from '../api/contract';

/**
 * Чтение биохимии. Здесь только выбор и подписи — ни одного решения о том,
 * нормально значение или нет: это сказал сервер полем `status`.
 */

/** Незнакомый статус остаётся нейтральным: угадывать тревогу нельзя. */
export function markerTone(status: string): Tone {
  return STATUS_TONE[status] ?? 'neutral';
}

/**
 * Тон отклонения. Применяется только к тому, что уже прошло `isOutOfRange`,
 * поэтому нейтрального исхода здесь нет и быть не может.
 */
export function outOfRangeTone(marker: Marker): 'warning' | 'danger' {
  return marker.status === 'warn' ? 'warning' : 'danger';
}

/** Показатель вне нормы — это `hi`, `lo` и `warn`. `unknown` сюда не входит. */
export function isOutOfRange(marker: Marker): boolean {
  return marker.status === 'hi' || marker.status === 'lo' || marker.status === 'warn';
}

/**
 * Что показать первым. Порядок продиктован ответом: сервер сам отмечает важные
 * ключи, и они идут раньше остальных, а внутри — сначала вышедшие из нормы.
 */
export function outOfRange(data: Biochemistry, limit: number): Marker[] {
  const important = new Set(data.importantKeys);
  return Object.values(data.markersByKey)
    .filter(isOutOfRange)
    .sort((a, b) => Number(important.has(b.markerKey)) - Number(important.has(a.markerKey)))
    .slice(0, limit);
}

export function markerValue(marker: Marker): string {
  if (marker.latestRaw) return marker.latestRaw;
  return marker.latestValue === null ? '—' : String(marker.latestValue);
}

/**
 * Подпись под значением. Норма приходит текстом от лаборатории и числами —
 * текст точнее, потому что он же напечатан в бланке.
 */
export function markerRange(marker: Marker): string | null {
  if (marker.refText) return marker.refText;
  const { refLow, refHigh } = marker;
  if (refLow !== null && refHigh !== null) return `${refLow}–${refHigh}`;
  if (refHigh !== null) return `< ${refHigh}`;
  if (refLow !== null) return `> ${refLow}`;
  return null;
}

/** Насколько давно мерили. Сервер уже посчитал возраст и своё отношение к нему. */
export function freshnessNote(marker: Marker): string | null {
  const { state, ageDays } = marker.freshness;
  if (state === 'fresh' || ageDays === null) return null;
  const years = Math.floor(ageDays / 365);
  const age = years >= 1 ? `${years} y ago` : `${Math.floor(ageDays / 30)} mo ago`;
  return state === 'stale' ? `${age} · worth repeating` : age;
}

/** Изменение относительно прошлого раза — словами сервера, без своей арифметики. */
export function deltaNote(delta: Marker['delta']): string | null {
  if (!delta.changed || delta.percent === null) return null;
  const arrow = delta.direction === 'up' ? '↑' : delta.direction === 'down' ? '↓' : '·';
  return `${arrow} ${Math.abs(Math.round(delta.percent))}%`;
}

/**
 * Точки для графика — только те, что сервер счёл сравнимыми. Он отсеивает
 * дубли и чужие единицы сам; рисовать отсеянное значит показывать динамику,
 * которой не было.
 */
export function chartable(points: readonly Observation[]): number[] {
  return points
    .filter((point) => point.chartEligibility.eligible && point.chartValue !== null)
    .map((point) => point.chartValue as number);
}

/**
 * Где значение стоит между границами нормы, 0–1. Границы объявил сервер —
 * клиент только размещает точку между ними и не решает, норма это или нет.
 * Без обеих границ шкалы нет: рисовать её от нуля значило бы придумать норму.
 */
export function scalePosition(
  value: number | null,
  low: number | null,
  high: number | null,
): number | null {
  if (value === null || low === null || high === null || high <= low) return null;
  return Math.min(1, Math.max(0, (value - low) / (high - low)));
}
