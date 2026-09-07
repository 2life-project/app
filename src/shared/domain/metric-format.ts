import { shortDay } from '@/shared/lib/day';

import {
  availability,
  coverageRatio,
  isStale,
  isThin,
  type MetricAggregation,
  type MetricValue,
} from './metric';

/**
 * Числа показывают одинаково во всех разделах, поэтому правило живёт здесь, а
 * не в каждом виджете. Единицу измерения клиент не пересчитывает: её приводит
 * сервер, а здесь она только подписывается.
 */

/** Прочерк вместо числа. Пустая строка выглядит как незагруженный экран. */
export const NO_VALUE = '—';

/** Узкий неразрывный пробел: единица не отрывается от числа. */
const NBSP = '\u202f';

/** Разряды разделяются запятой — так набраны числа в макете. */
const GROUP = ',';

/**
 * Знаков после запятой ровно столько, сколько несёт смысл: лишняя цифра у
 * пульса — шум, недостающая у веса — потеря разницы, ради которой взвешиваются.
 */
const DECIMALS: Record<string, number> = {
  '%': 0,
  bpm: 0,
  ms: 0,
  mmHg: 0,
  count: 0,
  kcal: 0,
  g: 0,
  mL: 0,
  cm: 1,
  km: 1,
  kg: 1,
  score: 1,
  'breaths/min': 1,
  'mL/kg/min': 1,
};

/** Единицы, которые не подписывают: счёт и время выводятся своим видом. */
const SILENT_UNITS = new Set(['count', 'h', 'score']);

function group(text: string): string {
  const [whole = '', fraction] = text.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP);
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}

/** Часы дробью читаются плохо: 7.7 ч — это 7:42, так это и показывают. */
function hoursToClock(value: number): string {
  const total = Math.round(value * 60);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function formatNumber(value: number, unit: string): string {
  if (unit === 'h') return hoursToClock(value);
  const decimals = DECIMALS[unit] ?? 1;
  return group(value.toFixed(decimals).replace(/\.0+$/, ''));
}

/** Само число без единицы — для кольца и крупной цифры. */
export function metricValueText(metric: MetricValue): string {
  return metric.value === null ? NO_VALUE : formatNumber(metric.value, metric.unit);
}

export function metricUnitText(metric: MetricValue): string {
  return SILENT_UNITS.has(metric.unit) ? '' : metric.unit;
}

/** Число с единицей — для строки списка и плитки. */
export function formatMetric(metric: MetricValue): string {
  if (metric.value === null) return NO_VALUE;
  const unit = metricUnitText(metric);
  return unit ? `${metricValueText(metric)}${NBSP}${unit}` : metricValueText(metric);
}

const AGGREGATION_LABEL: Record<MetricAggregation, string> = {
  latest: 'latest',
  avg: 'average',
  min: 'lowest',
  max: 'highest',
  sum: 'total',
};

/**
 * Строка под числом: на чём это число стоит. Она обязательна там, где значение
 * агрегировано, — иначе среднее за месяц читается как показание сегодняшнего дня.
 */
export function metricBasis(metric: MetricValue): string {
  if (availability(metric) === 'unavailable') return 'no access to the source';
  if (metric.value === null) return 'no data yet';

  if (metric.aggregation === 'latest') {
    const day = metric.latestDate ? shortDay(metric.latestDate) : null;
    if (!day) return 'latest';
    return isStale(metric) ? `as of ${day}` : day;
  }

  const period = `${AGGREGATION_LABEL[metric.aggregation]} of ${metric.period.days} days`;
  if (!isThin(metric)) return period;
  return `${period} · ${metric.coverage.daysWithData} of ${metric.coverage.expectedDays} days logged`;
}

/** Личное среднее — «обычно у тебя 62», а не «норма 62». Формулировка это держит. */
export function baselineText(metric: MetricValue): string | null {
  const baseline = metric.baseline;
  if (!baseline || baseline.value === null || baseline.samples < baseline.minimumSamples) {
    return null;
  }
  return `base ${formatNumber(baseline.value, metric.unit)}`;
}

/** Разница с прошлым значением со знаком: минус здесь несёт смысл. */
export function deltaText(metric: MetricValue): string | null {
  const delta = metric.delta;
  if (delta === null || delta === undefined || delta === 0) return null;
  const sign = delta > 0 ? '+' : '−';
  return `${sign}${formatNumber(Math.abs(delta), metric.unit)}`;
}

/** Доля покрытия в процентах — для подписи о полноте данных. */
export function coverageText(metric: MetricValue): string {
  return `${Math.round(coverageRatio(metric) * 100)}%`;
}
