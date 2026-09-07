/** Периоды на экране показателя — как в макете. */
export const METRIC_RANGES = [
  { value: '7d', label: '7 days' },
  { value: '28d', label: '28 days' },
  { value: '3m', label: '3 months' },
] as const;

export type MetricRange = (typeof METRIC_RANGES)[number]['value'];

const DAYS: Record<MetricRange, number> = { '7d': 7, '28d': 28, '3m': 90 };

/**
 * Начало периода отсчитываем от выбранного дня, а не от «сегодня» устройства:
 * сервер считает сутки в присланном поясе, и разойтись они не должны.
 */
export function rangeStart(date: string, range: MetricRange): string {
  const [year, month, day] = date.split('-').map(Number);
  const at = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  at.setUTCDate(at.getUTCDate() - DAYS[range] + 1);
  return at.toISOString().slice(0, 10);
}
