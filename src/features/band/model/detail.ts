import type { ActivitySample, SleepSegment } from '@/core/band';

import type { Point, Night } from './day-metrics';

/**
 * Глубокая статистика показателя: то, ради чего человек проваливается внутрь
 * блока. На обзорной карточке этому места нет — там одно число и ход за сутки.
 */

export type Hour = {
  hour: number;
  value: number;
  count: number;
};

/** Среднее по каждому часу и сколько замеров его подпирает. */
export function hourlyAverages(points: readonly Point[]): Hour[] {
  const totals = new Array<number>(24).fill(0);
  const counts = new Array<number>(24).fill(0);

  for (const point of points) {
    const hour = point.at.getHours();
    totals[hour] = (totals[hour] ?? 0) + point.value;
    counts[hour] = (counts[hour] ?? 0) + 1;
  }

  return totals.map((total, hour) => {
    const count = counts[hour] ?? 0;
    return { hour, value: count === 0 ? 0 : Math.round(total / count), count };
  });
}

/** Час с наибольшим и наименьшим средним. Пустые часы не участвуют. */
export function extremes(hours: readonly Hour[]): { low: Hour; high: Hour } | null {
  const measured = hours.filter((hour) => hour.count > 0);
  const first = measured[0];
  if (!first) return null;

  let low = first;
  let high = first;
  for (const hour of measured) {
    if (hour.value < low.value) low = hour;
    if (hour.value > high.value) high = hour;
  }
  return { low, high };
}

/** Отдельная прогулка: непрерывный отрезок ходьбы со своими цифрами. */
export type Bout = {
  from: Date;
  to: Date;
  minutes: number;
  steps: number;
  distance: number;
  cadence: number;
  speed: number;
};

const WALKING_STEPS = 20;

/**
 * Разбить день на прогулки. Дневной итог отвечает «сколько», прогулки — «когда
 * и как»: три часовых выхода и восемь минутных перебежек дают одно и то же
 * число шагов и совершенно разные дни.
 */
export function boutsOf(samples: readonly ActivitySample[]): Bout[] {
  const sorted = [...samples].sort((a, b) => a.at.getTime() - b.at.getTime());
  const bouts: Bout[] = [];
  let run: ActivitySample[] = [];

  const flush = () => {
    if (run.length === 0) return;
    const first = run[0];
    const last = run[run.length - 1];
    if (!first || !last) return;

    const steps = run.reduce((total, item) => total + (item.steps ?? 0), 0);
    const distance = run.reduce((total, item) => total + (item.distance ?? 0), 0);
    bouts.push({
      from: first.at,
      to: new Date(last.at.getTime() + 60_000),
      minutes: run.length,
      steps,
      distance,
      cadence: Math.round(steps / run.length),
      speed: Math.round(((distance / run.length) * 60) / 100) / 10,
    });
    run = [];
  };

  let previous: number | null = null;
  for (const sample of sorted) {
    const minute = Math.round(sample.at.getTime() / 60_000);
    const walking = (sample.steps ?? 0) >= WALKING_STEPS;
    // Пропуск в истории рвёт прогулку так же, как минута покоя: слоты приходят
    // не подряд, и склеивать их значит выдавать два выхода за один.
    if (!walking || previous === null || minute - previous !== 1) flush();
    if (walking) run.push(sample);
    previous = minute;
  }
  flush();

  return bouts.sort((a, b) => b.steps - a.steps);
}

export type SleepQuality = {
  /** Минуты от засыпания до подъёма, включая пробуждения. */
  inBed: number;
  asleep: number;
  /** Доля сна во времени в постели. */
  efficiency: number;
  awakenings: number;
  /** Циклы считаем по возвратам в быстрый сон: он завершает цикл. */
  cycles: number;
  longestBlock: number;
  shares: { deep: number; light: number; rem: number; awake: number };
};

export function qualityOf(night: Night, totals: Record<string, number>): SleepQuality {
  const asleep = night.minutes - (totals.awake ?? 0);
  const awakenings = night.segments.filter((segment) => segment.stage === 'awake').length;

  let cycles = 0;
  let previous: string | null = null;
  for (const segment of night.segments) {
    if (segment.stage === 'rem' && previous !== 'rem') cycles += 1;
    previous = segment.stage;
  }

  return {
    inBed: night.minutes,
    asleep,
    efficiency: night.minutes === 0 ? 0 : Math.round((asleep / night.minutes) * 100),
    awakenings,
    cycles,
    longestBlock: longestAsleep(night.segments),
    shares: {
      deep: percent(totals.deep ?? 0, night.minutes),
      light: percent(totals.light ?? 0, night.minutes),
      rem: percent(totals.rem ?? 0, night.minutes),
      awake: percent(totals.awake ?? 0, night.minutes),
    },
  };
}

/** Самый длинный сон без пробуждений: он важнее суммы для восстановления. */
function longestAsleep(segments: readonly SleepSegment[]): number {
  let best = 0;
  let current = 0;

  for (const segment of segments) {
    if (segment.stage === 'awake') current = 0;
    else current += segment.minutes;
    best = Math.max(best, current);
  }
  return best;
}

function percent(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}
