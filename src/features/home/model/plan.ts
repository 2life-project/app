import type { PlanItem } from '../api/contract';

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
  /** Отметить можно только приём: у него сервер даёт готовое действие. */
  markable: boolean;
};

/** Приём добавки: единственный вид пункта с действием отметки. */
export function isIntake(item: PlanItem): boolean {
  return item.action !== undefined;
}

export function planRowsOf(items: readonly PlanItem[]): PlanRow[] {
  return items.map((item) => ({
    id: item.id,
    title: `${item.kind} · ${item.domain}`,
    time: timeOf(item),
    done: item.status === 'done',
    markable: isIntake(item),
  }));
}

/**
 * Время пункта. У приёма без точного времени сервер присылает подпись словами
 * — «утро», «с едой»; выдумывать ей час нельзя.
 */
function timeOf(item: PlanItem): string {
  if (item.startAt !== null) {
    const at = new Date(item.startAt);
    return `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
  }
  return item.expectedTime ?? 'any time';
}

/** Приёмы дня — то, что раздел добавок показывает строками. */
export function intakesOf(items: readonly PlanItem[]): PlanItem[] {
  return items.filter(isIntake);
}
