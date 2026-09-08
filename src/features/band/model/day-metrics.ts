import type { ActivitySample, SleepSegment, StressSample } from '@/core/band';

/**
 * Показатели дня из поминутной истории браслета.
 *
 * Устройство отдаёт слоты по минутам, а на экране нужны ряды и сводки. Считаем
 * их здесь, а не в компоненте: одни и те же цифры показываются и числом, и
 * графиком, и расходиться они не должны.
 */

export type Summary = {
  min: number;
  max: number;
  average: number;
  last: number;
  count: number;
};

/** Точка ряда: значение и время, к которому оно относится. */
export type Point = {
  at: Date;
  value: number;
};

export function startOfToday(now = new Date()): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
}

/** Ряд одного показателя. Пустые слоты пропускаются: нуля там не было. */
export function seriesOf(
  samples: readonly ActivitySample[],
  pick: (sample: ActivitySample) => number | undefined,
): Point[] {
  const points: Point[] = [];

  for (const sample of samples) {
    const value = pick(sample);
    if (value === undefined || value === 0) continue;
    points.push({ at: sample.at, value });
  }

  return points.sort((a, b) => a.at.getTime() - b.at.getTime());
}

export function summaryOf(points: readonly Point[]): Summary | null {
  if (points.length === 0) return null;

  let min = Number.POSITIVE_INFINITY;
  let max = 0;
  let total = 0;

  for (const point of points) {
    min = Math.min(min, point.value);
    max = Math.max(max, point.value);
    total += point.value;
  }

  return {
    min,
    max,
    average: Math.round(total / points.length),
    last: points[points.length - 1]?.value ?? 0,
    count: points.length,
  };
}

/**
 * Сумма за каждый час суток. Нужна для столбцов: рисовать по минуте на столбец
 * бессмысленно — их почти полторы тысячи, и на экране это сплошная заливка.
 */
export function byHour(
  samples: readonly ActivitySample[],
  pick: (sample: ActivitySample) => number | undefined,
): number[] {
  const hours = new Array<number>(24).fill(0);

  for (const sample of samples) {
    const value = pick(sample);
    if (value === undefined) continue;
    const hour = sample.at.getHours();
    hours[hour] = (hours[hour] ?? 0) + value;
  }

  return hours;
}

/** Среднее по часам: для показателей, которые не складываются. */
export function averageByHour(points: readonly Point[]): number[] {
  const totals = new Array<number>(24).fill(0);
  const counts = new Array<number>(24).fill(0);

  for (const point of points) {
    const hour = point.at.getHours();
    totals[hour] = (totals[hour] ?? 0) + point.value;
    counts[hour] = (counts[hour] ?? 0) + 1;
  }

  return totals.map((total, hour) => {
    const count = counts[hour] ?? 0;
    return count === 0 ? 0 : Math.round(total / count);
  });
}

/**
 * Прорежённый ряд для линии. Точек за день бывает под тысячу, а по ширине
 * экрана различимы десятки — лишние только съедают память на отрисовку.
 */
export function thin(points: readonly Point[], limit = 120): number[] {
  if (points.length <= limit) return points.map((point) => point.value);

  const step = points.length / limit;
  const out: number[] = [];
  for (let index = 0; index < limit; index += 1) {
    out.push(points[Math.floor(index * step)]?.value ?? 0);
  }
  return out;
}

/** Доли по диапазонам: так вендор показывает зоны пульса и стресса. */
export type Zone = {
  label: string;
  from: number;
  to: number;
  share: number;
};

export function zonesOf(points: readonly Point[], ranges: readonly Omit<Zone, 'share'>[]): Zone[] {
  const total = points.length;

  return ranges.map((range) => {
    if (total === 0) return { ...range, share: 0 };
    const hits = points.filter(
      (point) => point.value >= range.from && point.value <= range.to,
    ).length;
    return { ...range, share: Math.round((hits / total) * 100) };
  });
}

export const HEART_RATE_ZONES = [
  { label: 'Rest', from: 0, to: 98 },
  { label: 'Warm-up', from: 99, to: 118 },
  { label: 'Fat burn', from: 119, to: 137 },
  { label: 'Aerobic', from: 138, to: 157 },
  { label: 'Anaerobic', from: 158, to: 177 },
  { label: 'Peak', from: 178, to: 250 },
] as const;

export const STRESS_ZONES = [
  { label: 'Relaxed', from: 1, to: 29 },
  { label: 'Normal', from: 30, to: 59 },
  { label: 'Medium', from: 60, to: 79 },
  { label: 'High', from: 80, to: 100 },
] as const;

/** Стресс приходит своим каналом, а не в поминутных слотах. */
export function stressPoints(samples: readonly StressSample[], from: Date): Point[] {
  return samples
    .filter((sample) => sample.at >= from)
    .map((sample) => ({ at: sample.at, value: sample.value }))
    .sort((a, b) => a.at.getTime() - b.at.getTime());
}

/**
 * Ночь целиком: от засыпания до пробуждения. Маркеры начала и конца сессии
 * длительности не несут, поэтому в подсчёт стадий не идут.
 */
export type Night = {
  from: Date;
  to: Date;
  minutes: number;
  segments: SleepSegment[];
};

export function lastNight(segments: readonly SleepSegment[]): Night | null {
  const real = segments.filter(
    (segment) =>
      segment.minutes > 0 && segment.stage !== 'sessionStart' && segment.stage !== 'sessionEnd',
  );
  if (real.length === 0) return null;

  const sorted = [...real].sort((a, b) => a.at.getTime() - b.at.getTime());
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (!first || !last) return null;

  // Ночь может начаться до полуночи, поэтому берём последний непрерывный
  // отрезок: разрыв больше трёх часов — это уже другой сон.
  const night: SleepSegment[] = [last];
  for (let index = sorted.length - 2; index >= 0; index -= 1) {
    const current = sorted[index];
    const next = night[0];
    if (!current || !next) break;
    const gapMinutes =
      (next.at.getTime() - (current.at.getTime() + current.minutes * 60_000)) / 60_000;
    if (gapMinutes > 180) break;
    night.unshift(current);
  }

  const start = night[0];
  const end = night[night.length - 1];
  if (!start || !end) return null;

  return {
    from: start.at,
    to: new Date(end.at.getTime() + end.minutes * 60_000),
    minutes: night.reduce((total, segment) => total + segment.minutes, 0),
    segments: night,
  };
}
