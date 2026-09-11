import { formatNumber, NO_VALUE } from '@/shared/domain';
import { shortDay } from '@/shared/lib/day';

import type { HomeData, LayoutCell, PlanItem, WidgetType } from '../api/contract';

/**
 * Данные виджетов Главной. У каждого типа своя форма, и спека её не описывает
 * (`x-untyped`), поэтому здесь проверка по живым ответам: чего нет — того и не
 * рисуем, а не падаем на незнакомом поле.
 */

/** Значение показателя в конверте виджета: берём только то, что показываем. */
type Measure = {
  value: number | null;
  unit?: string | null;
  provenance?: { source?: string | null } | null;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isMeasure(value: unknown): value is Measure {
  return isObject(value) && 'value' in value;
}

/** Данные ячейки: по её идентификатору, а без совпадения — по типу виджета. */
export function widgetData(home: HomeData, cell: LayoutCell): unknown {
  const byId = home.widgets.find((widget) => widget.id === cell.id);
  return (byId ?? home.widgets.find((widget) => widget.type === cell.widget))?.data;
}

/** Данные виджета по типу — когда ячейки нет, а конверт с числами есть. */
export function widgetOfType(home: HomeData, type: WidgetType): unknown {
  return home.widgets.find((widget) => widget.type === type)?.data;
}

// ------------------------------------------------------------ восстановление

export type RecoverExtra = {
  sleepHours: number | null;
  sleepSource: string | null;
  hrvMs: number | null;
  restingBpm: number | null;
};

export function recoverExtraOf(data: unknown): RecoverExtra {
  const widget = isObject(data) ? data : {};
  const sleep = isObject(widget.sleep) ? widget.sleep.duration : undefined;
  return {
    sleepHours: isMeasure(sleep) ? sleep.value : null,
    sleepSource: isMeasure(sleep) ? (sleep.provenance?.source ?? null) : null,
    hrvMs: isMeasure(widget.hrv) ? widget.hrv.value : null,
    restingBpm: isMeasure(widget.restingHeartRate) ? widget.restingHeartRate.value : null,
  };
}

// ------------------------------------------------------------------ следующее

function isPlanItem(value: unknown): value is PlanItem {
  return isObject(value) && typeof value.id === 'string' && typeof value.kind === 'string';
}

/** Что сервер считает следующим: список пунктов в порядке наступления. */
export function nextItemsOf(data: unknown): PlanItem[] {
  const next = isObject(data) ? data.next : undefined;
  return Array.isArray(next) ? next.filter(isPlanItem) : [];
}

// --------------------------------------------------------------------- приёмы

export type DoseRow = {
  id: string;
  title: string;
  /** Час или подпись слота: «08:00», «Утро». */
  when: string;
  detail?: string;
  status: 'pending' | 'taken' | 'skipped';
};

export type DosesView = { rows: DoseRow[]; total: number; taken: number };

function statusOf(value: unknown): DoseRow['status'] {
  return value === 'taken' || value === 'skipped' ? value : 'pending';
}

export function dosesOf(data: unknown): DosesView | null {
  const section = isObject(data) ? data.data : undefined;
  if (!isObject(section) || !Array.isArray(section.slots)) return null;

  const rows: DoseRow[] = [];
  for (const slot of section.slots) {
    if (!isObject(slot) || !Array.isArray(slot.items)) continue;
    const slotLabel = typeof slot.label === 'string' ? slot.label : '';
    for (const item of slot.items) {
      if (!isObject(item) || typeof item.id !== 'string') continue;
      const product = isObject(item.product) ? item.product : {};
      const course = isObject(item.course) ? item.course : {};
      const when = typeof item.expectedTime === 'string' ? item.expectedTime : slotLabel;
      rows.push({
        id: item.id,
        title: typeof product.name === 'string' ? product.name : 'Supplement',
        when,
        detail: typeof course.name === 'string' ? course.name : undefined,
        status: statusOf(item.status),
      });
    }
  }

  const summary = isObject(section.summary) ? section.summary : {};
  return {
    rows,
    total: typeof summary.total === 'number' ? summary.total : rows.length,
    taken:
      typeof summary.taken === 'number'
        ? summary.taken
        : rows.filter((row) => row.status === 'taken').length,
  };
}

// ----------------------------------------------------------------------- цели

export type GoalRow = { id: string; title: string; target: string; by?: string };

const GOAL_UNITS: Record<string, string> = {
  weightKg: 'kg',
  water_ml: 'ml',
};

export function goalsOf(home: HomeData): GoalRow[] {
  const goals = home.goals.data ?? [];
  const rows: GoalRow[] = [];
  for (const goal of goals) {
    if (!isObject(goal) || typeof goal.id !== 'string') continue;
    const metric = typeof goal.metric === 'string' ? goal.metric : '';
    const title = typeof goal.title === 'string' ? goal.title : metric;
    const unit = GOAL_UNITS[metric] ?? '';
    rows.push({
      id: goal.id,
      title: METRIC_TITLES[title] ?? METRIC_TITLES[metric] ?? title,
      target:
        typeof goal.target === 'number'
          ? `${formatNumber(goal.target, unit)} ${unit}`.trim()
          : NO_VALUE,
      by: typeof goal.target_date === 'string' ? `by ${shortDay(goal.target_date)}` : undefined,
    });
  }
  return rows;
}

// --------------------------------------------------------------------- потоки

export type StreamRow = {
  key: string;
  title: string;
  value: string;
  /** То же число без форматирования: сводка дня считает и сравнивает. */
  raw: number;
  /** Откуда число: браслет, трекер, чек-ин, ручной ввод. */
  source: string;
  when: string;
  fresh: boolean;
};

/** Имена показателей словами: сервер отдаёт ключи, а человек читает подписи. */
export const METRIC_TITLES: Record<string, string> = {
  water_ml: 'Water',
  heart_rate: 'Heart rate',
  steps: 'Steps',
  spo2: 'Blood oxygen',
  active_energy: 'Active energy',
  hrv: 'HRV',
  rhr: 'Resting heart rate',
  sleep_duration: 'Sleep',
  calories: 'Calories eaten',
  weight: 'Weight',
  weightKg: 'Weight',
  fat_percent: 'Body fat',
  muscle_mass: 'Muscle mass',
  mood: 'Mood',
  energy: 'Energy',
  focus: 'Focus',
  appetite: 'Appetite',
  height: 'Height',
};

const SOURCE_TITLES: Record<string, string> = {
  es100: 'band',
  wellbeing_daily_entries: 'check-in',
  meal_entries: 'meals',
  body_manual_measurements: 'by hand',
  body_circumferences: 'by hand',
  user_profiles: 'profile',
};

function humanize(key: string): string {
  const words = key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Браслет на руке главнее чужого суточного агрегата на тот же показатель. */
function rankOf(source: string, stale: boolean, at: number): number {
  return (source === 'es100' ? 2 : 0) + (stale ? 0 : 1) + at / 1e15;
}

/**
 * Одно значение на показатель. Сервер шлёт все наблюдения дня по всем
 * источникам; человеку нужен один пульс, а не три: с браслета, свежий, а
 * среди равных — последний. Браслет — первым: за ним человек и пришёл.
 */
export function streamsOf(home: HomeData): StreamRow[] {
  const latest = new Map<string, { rank: number; row: StreamRow }>();
  for (const stream of home.streams) {
    if (!isObject(stream) || typeof stream.key !== 'string' || typeof stream.value !== 'number') {
      continue;
    }
    const parsed = typeof stream.observedAt === 'string' ? Date.parse(stream.observedAt) : 0;
    const at = Number.isFinite(parsed) ? parsed : 0;
    const source = typeof stream.source === 'string' ? stream.source : '';
    const rank = rankOf(source, stream.stale === true, at);
    const known = latest.get(stream.key);
    if (known && known.rank >= rank) continue;

    const unit = typeof stream.unit === 'string' && stream.unit !== 'count' ? stream.unit : '';
    const date = typeof stream.date === 'string' ? stream.date : '';
    latest.set(stream.key, {
      rank,
      row: {
        key: stream.key,
        title: METRIC_TITLES[stream.key] ?? humanize(stream.key),
        raw: stream.value,
        value: `${formatNumber(stream.value, unit)}${unit ? ` ${unit}` : ''}`,
        source: SOURCE_TITLES[source] ?? source,
        when: date === home.date ? 'today' : date ? shortDay(date) : '',
        fresh: stream.stale !== true,
      },
    });
  }
  return [...latest.values()]
    .sort((a, b) => b.rank - a.rank || a.row.title.localeCompare(b.row.title))
    .map((entry) => entry.row);
}
