import * as cmd from './commands';
import { type Field, parseModal } from './tlv';
import type { BandTransport } from './transport';

/**
 * Тренировки.
 *
 * Раскладка полей здесь **не проверена на устройстве** и проверена быть не
 * может: у ES100 нет ни экрана, ни кнопки старта тренировки — записать её
 * нечем, а разбирать пустой список бессмысленно. Поэтому сводка и детализация
 * отдаются полями как есть, без выдуманной структуры: придумать ей имена
 * значило бы договориться с собой вместо устройства.
 *
 * Список при этом разобран верно: в нём лежат два индекса подряд, и в чужих
 * разборах их регулярно склеивают в одно число — «тренировка №3610» вместо
 * «третья тренировка, двадцать шестой отрезок темпа».
 */

/** Ссылка на тренировку в списке устройства. */
export type WorkoutRef = {
  /** Порядковый номер тренировки. */
  index: number;
  /** Номер отрезка темпа: детализация запрашивается по нему отдельно. */
  paceIndex: number;
};

export function decodeWorkoutList(body: Uint8Array): WorkoutRef[] {
  const refs: WorkoutRef[] = [];

  for (const item of parseModal(body)) {
    if (item.value.length < 2) continue;
    refs.push({ index: item.value[0] ?? 0, paceIndex: item.value[1] ?? 0 });
  }

  return refs;
}

export class BandWorkouts {
  constructor(private readonly transport: BandTransport) {}

  async list(from: Date, to: Date): Promise<WorkoutRef[]> {
    return decodeWorkoutList(await this.transport.request(cmd.readWorkoutList(from, to)));
  }

  /** Сводка тренировки полями как есть — см. оговорку в шапке файла. */
  async summary(id: number): Promise<Field[]> {
    return parseModal(await this.transport.request(cmd.readWorkoutSummary(id)));
  }

  async detail(id: number, index: number): Promise<Field[]> {
    return parseModal(await this.transport.request(cmd.readWorkoutDetail(id, index)));
  }

  async pace(id: number, index: number): Promise<Field[]> {
    return parseModal(await this.transport.request(cmd.readWorkoutPace(id, index)));
  }

  /** Какие виды спорта знает прошивка. Номера видов — её внутренние. */
  async catalog(): Promise<number[]> {
    const body = await this.transport.request(cmd.readSportCatalog());
    return [...body];
  }
}
