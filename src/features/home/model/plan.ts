import type { HomeData, PlanItem } from '../api/contract';

/**
 * Объединённый план дня: задачи, правила протоколов и приёмы добавок одним
 * списком. Приходит с Главной, а не с `/plan/daily`: та ручка знает только
 * задачи календаря, и у человека с курсом приёма она отвечала бы пустотой.
 */
export type PlanRow = {
  id: string;
  /** Что за пункт — словами сервера: заголовка у пункта в контракте нет. */
  title: string;
  time: string;
  done: boolean;
};

/** Приём добавки: единственный вид пункта с действием отметки. */
export function isIntake(item: PlanItem): boolean {
  return item.action !== undefined;
}

/** Отметки, поставленные с экрана и ещё не пришедшие в ответе: `id` → выполнено. */
export type LocalMarks = Record<string, boolean>;

function isDone(item: PlanItem, marks: LocalMarks): boolean {
  return marks[item.id] ?? item.status === 'done';
}

/** Приёмы дня строками — то, что раздел добавок показывает и отмечает. */
export function intakeRowsOf(items: readonly PlanItem[], marks: LocalMarks = {}): PlanRow[] {
  return items.filter(isIntake).map((item) => ({
    id: item.id,
    title: `${item.kind} · ${item.domain}`,
    time: timeOf(item),
    done: isDone(item, marks),
  }));
}

/**
 * Счёт плана с поправкой на отметки, поставленные здесь: сервер их принял, а
 * лента ещё старая, и кольцо не должно отставать от галочек под ним.
 */
export function planCounts(
  plan: HomeData['plan'],
  marks: LocalMarks = {},
): { done: number; total: number } {
  let done = plan.done;
  for (const item of plan.items) {
    const local = marks[item.id];
    if (local === undefined) continue;
    if (local && item.status !== 'done') done += 1;
    if (!local && item.status === 'done') done -= 1;
  }
  return { done: Math.max(0, Math.min(plan.total, done)), total: plan.total };
}

/**
 * Время пункта. У приёма без точного времени сервер присылает подпись словами
 * — «утро», «с едой»; выдумывать ей час нельзя.
 */
export function timeOf(item: PlanItem): string {
  if (item.startAt !== null) {
    const at = new Date(item.startAt);
    return `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
  }
  return item.expectedTime ?? 'any time';
}
