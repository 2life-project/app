import { type ActivitySample, type StressDay } from '../api';

export { HEART_RATE_ZONES, STRESS_ZONES } from '../api';

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

/**
 * Добавить живой отчёт в историю дня.
 *
 * Отчёты приходят каждые десять секунд, а слот в истории — минутный: без
 * замены по времени один и тот же час превращается в шесть точек на минуту, и
 * график дня растёт быстрее самого дня.
 *
 * Живой отчёт при этом слабее истории: он несёт накопленное за незавершённую
 * минуту, а история — её итог.
 */
export function appendSample(
  samples: readonly ActivitySample[],
  sample: ActivitySample,
): ActivitySample[] {
  const minute = Math.floor(sample.at.getTime() / 60_000);
  const existing = samples.find((item) => Math.floor(item.at.getTime() / 60_000) === minute);

  // Готовую минуту из истории живым отчётом не трогаем: он накапливается по
  // ходу минуты и всегда занижен относительно её итога.
  if (existing?.source === 'history' && sample.source === 'live') return [...samples];

  // Два живых отчёта на одну минуту сливаются, а не заменяют друг друга: набор
  // показателей растёт по ходу минуты, и поздний отчёт с одним полем стёр бы
  // четыре, пришедшие раньше.
  const merged =
    existing?.source === 'live' && sample.source === 'live' ? { ...existing, ...sample } : sample;

  const kept = samples.filter((item) => Math.floor(item.at.getTime() / 60_000) !== minute);
  kept.push(merged);
  return kept.sort((a, b) => a.at.getTime() - b.at.getTime());
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

/** Стресс приходит своим каналом, а не в поминутных слотах. */
export function stressPoints(days: readonly StressDay[], from: Date): Point[] {
  const samples = days.flatMap((day) => day.samples);
  return samples
    .filter((sample) => sample.at >= from)
    .map((sample) => ({ at: sample.at, value: sample.value }))
    .sort((a, b) => a.at.getTime() - b.at.getTime());
}

/**
 * Подпись под числом: сколько замеров легло в этот день.
 *
 * Одна на все карточки. Пока каждая писала свою, «нет данных» и счёт замеров
 * звучали в разделе по-разному, а половина строк осталась непереведённой.
 */
export function readingsCaption(count: number): string {
  if (count === 0) return 'нет данных';
  if (count === 1) return '1 замер за сегодня';
  return `${count} замеров за сегодня`;
}

/** Последний известный пульс покоя: он приходит не в каждом слоте. */
export function lastResting(samples: readonly ActivitySample[]): number | undefined {
  for (let index = samples.length - 1; index >= 0; index -= 1) {
    const value = samples[index]?.restingHeartRate;
    if (value) return value;
  }
  return undefined;
}
