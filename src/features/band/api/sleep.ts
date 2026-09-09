import {
  sleepTotals,
  type SleepSegment,
  type SleepStageName,
  type SleepStageOnly,
} from './sleep-stages';

/**
 * Сон сессиями.
 *
 * Устройство размечает сессии само: перед каждым сном идёт `sessionStart`, за
 * ним `sessionEnd`, оба нулевой длительности. Проверено на живых данных — в
 * одной выгрузке лежали дневной сон на 27 минут и ночь на восемь часов,
 * разделённые именно этими маркерами.
 *
 * Плоский список сегментов без сессий бессмыслен: стадии имеют смысл внутри
 * одного сна, а сложенные за неделю не значат ничего.
 */

/** Разрыв, по которому сон режется на сессии, когда маркеров устройства нет. */
export const SLEEP_GAP_MINUTES = 180;

export type SleepSession = {
  from: Date;
  to: Date;
  /** Минуты от засыпания до подъёма, включая пробуждения. */
  inBed: number;
  /** Минуты собственно сна: без пробуждений. */
  asleep: number;
  /** Доля сна во времени в постели, проценты. */
  efficiency: number;
  awakenings: number;
  /** Циклы считаем по возвратам в быстрый сон: он завершает цикл. */
  cycles: number;
  /** Самый длинный сон без пробуждений — он важнее суммы для восстановления. */
  longestBlock: number;
  totals: Record<SleepStageOnly, number>;
  /** Доли стадий во времени в постели, проценты. */
  shares: Record<'deep' | 'light' | 'rem' | 'awake', number>;
  segments: SleepSegment[];
};

/**
 * Собрать сессии. Маркеры устройства — основной признак; разрыв во времени
 * остаётся запасным, потому что в старых записях маркеров может не быть, а
 * терять из-за этого целую ночь нельзя.
 */
export function groupSleep(segments: readonly SleepSegment[]): SleepSession[] {
  const sorted = [...segments].sort((a, b) => a.at.getTime() - b.at.getTime());
  const sessions: SleepSegment[][] = [];
  let current: SleepSegment[] = [];

  const close = () => {
    if (current.length > 0) sessions.push(current);
    current = [];
  };

  for (const segment of sorted) {
    if (segment.stage === 'sessionStart') {
      close();
      continue;
    }
    if (segment.stage === 'sessionEnd') {
      close();
      continue;
    }
    if (segment.minutes === 0) continue;

    const previous = current[current.length - 1];
    if (previous && gap(previous, segment) > SLEEP_GAP_MINUTES) close();

    current.push(segment);
  }
  close();

  return sessions.map(describe).filter((session): session is SleepSession => session !== null);
}

/** Последняя сессия — та, что ближе к настоящему моменту. */
export function lastSleep(segments: readonly SleepSegment[]): SleepSession | null {
  const sessions = groupSleep(segments);
  return sessions[sessions.length - 1] ?? null;
}

function gap(previous: SleepSegment, next: SleepSegment): number {
  const end = previous.at.getTime() + previous.minutes * 60_000;
  return (next.at.getTime() - end) / 60_000;
}

function describe(segments: SleepSegment[]): SleepSession | null {
  const first = segments[0];
  const last = segments[segments.length - 1];
  if (!first || !last) return null;

  const totals = sleepTotals(segments);
  const to = new Date(last.at.getTime() + last.minutes * 60_000);
  const inBed = Math.round((to.getTime() - first.at.getTime()) / 60_000);
  const asleep = inBed - totals.awake;

  return {
    from: first.at,
    to,
    inBed,
    asleep,
    efficiency: inBed === 0 ? 0 : Math.round((asleep / inBed) * 100),
    awakenings: segments.filter((segment) => segment.stage === 'awake').length,
    cycles: countCycles(segments),
    longestBlock: longestAsleep(segments),
    totals,
    shares: {
      deep: percent(totals.deep, inBed),
      light: percent(totals.light, inBed),
      rem: percent(totals.rem, inBed),
      awake: percent(totals.awake, inBed),
    },
    segments,
  };
}

function percent(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

function countCycles(segments: readonly SleepSegment[]): number {
  let cycles = 0;
  let previous: SleepStageName | null = null;

  for (const segment of segments) {
    if (segment.stage === 'rem' && previous !== 'rem') cycles += 1;
    previous = segment.stage;
  }
  return cycles;
}

function longestAsleep(segments: readonly SleepSegment[]): number {
  let best = 0;
  let run = 0;

  for (const segment of segments) {
    run = segment.stage === 'awake' ? 0 : run + segment.minutes;
    best = Math.max(best, run);
  }
  return best;
}
