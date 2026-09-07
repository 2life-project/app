/**
 * Метрика в контракте — не число, а конверт вокруг числа, и правила чтения
 * этого конверта одни на всё приложение: их читают Главная, Тело и Медкарта.
 *
 * Правила, которые здесь закодированы (каждое взято из самого контракта):
 *
 * 1. Значение бессмысленно без `aggregation` и `period`: «80» — это последнее
 *    за день или среднее за 28 дней, и это разные утверждения.
 * 2. Отсутствие бывает двух видов. `missing` — пользователь ничего не вносил,
 *    ему предлагают внести. `unavailableReason` — система не может прочитать
 *    источник; предлагать ввод здесь бессмысленно, чинить надо связь.
 * 3. Устаревшее — не недействительное: политика сервера прямо сказана в
 *    `freshness.policy`. Старое значение показывают с датой, а не прячут.
 * 4. `coverage` — это доверие к числу. Среднее по 3 дням из 28 средним не
 *    является, и об этом надо сказать рядом с числом.
 * 5. Доля кольца считается только от того, от чего разрешил считать сервер:
 *    `percentBasis` или `target`. Своей нормы у клиента нет — без основания
 *    кольцо остаётся без дуги.
 * 6. Цвет — не функция числа. Норму задаёт `referenceRanges`, а `baseline` —
 *    это личное среднее (`personal_observed_mean`, `clinicalReference: false`),
 *    то есть «обычно у тебя так», а не «так правильно».
 * 7. Единицы приводит сервер: клиент отправляет то, что ввёл человек, и всегда
 *    показывает `unit` из ответа. Своей таблицы пересчёта у клиента нет.
 */

/** Как получено значение: агрегат за период. */
export type MetricAggregation = 'latest' | 'avg' | 'min' | 'max' | 'sum';

export type MetricPeriod = { startDate: string; endDate: string; days: number };

/** Сколько дней периода реально имеют данные. Это доверие к числу. */
export type MetricCoverage = { daysWithData: number; expectedDays: number };

export type MetricPoint = {
  date: string;
  value: number | null;
  observedAt: string | null;
  samples: number;
};

/** Откуда взято значение. Оценка прибора и ручной ввод остаются различимы. */
export type MetricProvenance = {
  source: string;
  origin?: string;
  method?: string;
  dailyReduction?: string;
  seriesId?: string;
};

export type MetricFreshness = {
  stale: boolean | null;
  observedAt: string | null;
  latestDate: string | null;
  policy: string;
};

/** Личное среднее за окно. Не клиническая норма — сервер говорит это явно. */
export type MetricBaseline = {
  value: number | null;
  kind: string;
  startDate: string;
  endDate: string;
  samples: number;
  minimumSamples: number;
  clinicalReference: boolean;
};

/** Можно ли внести значение руками и куда. */
export type MetricManual = {
  allowed: boolean;
  endpoint: string;
  unit: string;
  minimum: number | null;
  maximum: number | null;
  minimumExclusive: boolean;
};

/**
 * Конверт значения. `alternatives`, `warnings` и `referenceRanges` оставлены
 * нетипизированными намеренно: во всех выданных примерах они пусты, а
 * придумывать их форму — значит договориться с собой, а не с сервером.
 */
export type MetricValue = {
  key: string;
  name: string;
  unit: string;
  aggregation: MetricAggregation;
  value: number | null;
  status: string;
  period: MetricPeriod;
  coverage: MetricCoverage;
  latestDate: string | null;
  observedAt: string | null;
  stale: boolean | null;
  target: number | null;
  points: readonly MetricPoint[];
  provenance: MetricProvenance | null;
  selection: string;
  alternatives: readonly unknown[];
  warnings: readonly unknown[];
  unavailableReason?: string | null;
  freshness?: MetricFreshness;
  baseline?: MetricBaseline | null;
  referenceRanges?: readonly unknown[];
  manual?: MetricManual;
  previous?: number | null;
  delta?: number | null;
};

/** Три состояния вместо двух: число, «не вносили», «прочитать нельзя». */
export type MetricAvailability = 'value' | 'missing' | 'unavailable';

export function availability(metric: MetricValue): MetricAvailability {
  if (metric.unavailableReason) return 'unavailable';
  if (metric.status === 'available' && metric.value !== null) return 'value';
  return 'missing';
}

/** Ввод руками предлагают только там, где сервер его принимает. */
export function acceptsManualEntry(metric: MetricValue): boolean {
  return metric.manual?.allowed === true;
}

export function isStale(metric: MetricValue): boolean {
  return metric.freshness?.stale ?? metric.stale ?? false;
}

/** Доля дней периода с данными: 0 — ни одного, 1 — все. */
export function coverageRatio(metric: MetricValue): number {
  const { daysWithData, expectedDays } = metric.coverage;
  return expectedDays > 0 ? daysWithData / expectedDays : 0;
}

/**
 * Ниже этой доли число ещё показывают, но говорят, на скольких днях оно
 * стоит: «среднее» по четверти периода вводит в заблуждение молча.
 */
const TRUSTED_COVERAGE = 0.5;

export function isThin(metric: MetricValue): boolean {
  return metric.aggregation !== 'latest' && coverageRatio(metric) < TRUSTED_COVERAGE;
}

/** Доля от 0 до 1: всё, что вылезает за края, обрезается. */
function clamp(ratio: number): number {
  return Math.max(0, Math.min(1, ratio));
}

/**
 * Доля заполнения дуги. Оснований ровно два, и оба даёт не клиент: цель,
 * названную сервером, и саму единицу измерения — у процента шкала 0…100 по
 * определению, а не по чьей-то норме. Без основания дуги не будет: рисовать её
 * «на глаз» значит показать оценку там, где её никто не давал.
 */
export function metricFill(metric: MetricValue): number | null {
  const { value, target, unit } = metric;
  if (value === null) return null;
  if (target !== null && target > 0) return clamp(value / target);
  if (unit === '%') return clamp(value / 100);
  return null;
}

/** Доля для кольца, которое сервер уже посчитал сам. */
export function percentFill(percent: number | null): number | null {
  return percent === null ? null : clamp(percent / 100);
}
