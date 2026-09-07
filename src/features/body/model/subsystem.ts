import {
  formatMetric,
  metricBasis,
  metricUnitText,
  metricValueText,
  percentFill,
  type MetricValue,
} from '@/shared/domain';

import type { SubsystemData } from '../api/contract';

/**
 * Подсистема тела для экрана. Сервер отдаёт кольцо и набор показателей тем же
 * конвертом, что и везде, поэтому вид собирается из них, а не описывается
 * отдельно для каждой из четырёх систем.
 */
export type SubsystemView = {
  title: string;
  caption: string;
  ring: { value: number | null; valueLabel: string; note?: string };
  rows: { id: string; title: string; subtitle?: string; value: string }[];
  tiles: { label: string; value: string; unit?: string; note?: string }[];
  /** Ряды точек для графиков — только у показателей, где есть история. */
  charts: { id: string; title: string; caption: string; values: number[] }[];
  /** Что можно поставить в кольцо: ключи от сервера плюс их человеческие имена. */
  options: { id: string; title: string; subtitle: string }[];
};

/** Точки без пропусков: график рисует измеренное, а не нули вместо него. */
function series(metric: MetricValue): number[] {
  return metric.points
    .map((point) => point.value)
    .filter((value): value is number => value !== null);
}

function byKey(data: SubsystemData, key: string): MetricValue | undefined {
  return data.metrics.find((metric) => metric.key === key);
}

export function subsystemView(data: SubsystemData): SubsystemView {
  const ringMetric = byKey(data, data.ring.metric);

  return {
    title: data.name,
    caption: `${data.ring.metric.toUpperCase().replace(/_/g, ' ')} · ${
      ringMetric ? metricBasis(ringMetric) : 'no data yet'
    }`,
    ring: {
      // Долю считает сервер и говорит, от чего: `percentBasis`. Своей нормы
      // у клиента нет, поэтому без процента кольцо остаётся дорожкой.
      value: percentFill(data.ring.percent),
      valueLabel: ringMetric ? metricValueText(ringMetric) : '—',
      note: data.ring.unit === 'score' ? undefined : data.ring.unit,
    },
    rows: data.metrics.slice(0, 3).map((metric) => ({
      id: metric.key,
      title: metric.name,
      subtitle: metricBasis(metric),
      value: formatMetric(metric),
    })),
    tiles: data.metrics.slice(0, 3).map((metric) => ({
      label: metric.name.toUpperCase(),
      value: metricValueText(metric),
      unit: metricUnitText(metric),
      note: metricBasis(metric),
    })),
    charts: data.metrics
      .filter((metric) => series(metric).length > 1)
      .slice(0, 2)
      .map((metric) => ({
        id: metric.key,
        title: `${metric.name} · ${metric.period.days} days`,
        caption: formatMetric(metric),
        values: series(metric),
      })),
    options: data.ring.options.map((key) => {
      const metric = byKey(data, key);
      return {
        id: key,
        title: metric?.name ?? key,
        subtitle: metric ? `${formatMetric(metric)} · ${metricBasis(metric)}` : 'no data yet',
      };
    }),
  };
}

export const RING_NOTE =
  'The ring shows one metric — the one you steer this system by. The rest stay in the summary below.';
