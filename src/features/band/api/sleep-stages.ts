import { be16, be32, byteAt } from './bytes';

/**
 * Стадии сна и их итоги.
 *
 * Отдельно от дневных показателей: у сна своя таблица стадий, свои служебные
 * маркеры сессии и свои правила подсчёта, и с шагами они не пересекаются ничем.
 */

export const SleepStage = {
  deep: 1,
  light: 2,
  awake: 3,
  rem: 4,
  nap: 5,
  snore: 6,
  sessionStart: 7,
  sessionEnd: 8,
} as const;

export type SleepStageName = keyof typeof SleepStage;

/**
 * Стадии, которые действительно бывают у сна.
 *
 * `sessionStart` и `sessionEnd` — служебные маркеры, которыми устройство режет
 * ночь на сессии. Наружу они уходить не должны: в итогах ночи «пять минут
 * начала сессии» смысла не имеют, а принимающая сторона про них не знает.
 */
export const SLEEP_STAGES = ['deep', 'light', 'awake', 'rem', 'nap', 'snore'] as const;

export type SleepStageOnly = (typeof SLEEP_STAGES)[number];

const STAGE_NAMES = Object.fromEntries(
  Object.entries(SleepStage).map(([name, value]) => [value, name]),
) as Record<number, SleepStageName>;

export type SleepSegment = {
  at: Date;
  minutes: number;
  stage: SleepStageName;
};

/**
 * Сон: две служебные байта заголовка, затем записи по семь байт.
 *
 * Стадии взяты из констант SDK вендора, а не из чужих разборов протокола: в
 * популярном реверсе третья и четвёртая перепутаны местами, из-за чего быстрый
 * сон превращается в пробуждения и ночь выглядит рваной.
 */
export function decodeSleep(body: Uint8Array): SleepSegment[] {
  const segments: SleepSegment[] = [];

  for (let offset = 2; offset + 6 < body.length; offset += 7) {
    const seconds = be32(body, offset) ?? 0;
    const minutes = be16(body, offset + 4) ?? 0;
    const stage = STAGE_NAMES[byteAt(body, offset + 6)];
    if (!stage || seconds === 0) continue;

    segments.push({ at: new Date(seconds * 1000), minutes, stage });
  }

  return segments;
}

/** Сколько минут пришлось на каждую стадию. Маркеры сессии не считаются. */
export function sleepTotals(segments: readonly SleepSegment[]): Record<SleepStageOnly, number> {
  // Ключи берутся из списка настоящих стадий, а не из всей таблицы: маркеры
  // начала и конца сессии наружу уходить не должны.
  const totals = Object.fromEntries(SLEEP_STAGES.map((name) => [name, 0])) as Record<
    SleepStageOnly,
    number
  >;

  for (const segment of segments) {
    if (segment.stage in totals) totals[segment.stage as SleepStageOnly] += segment.minutes;
  }

  return totals;
}
