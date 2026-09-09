import { sportName } from '../api/sports';

/**
 * Каким видом помечать занятие.
 *
 * Каталог устройства читать ради этого не нужно: у ES100 он на полсотни
 * позиций, из которых прошивка всё равно ничего не различает — она считает
 * шаги и пульс одинаково для всех. Вид нужен нам самим, чтобы занятие
 * называлось в приложении так, как его назвал человек.
 */

/** Что предлагаем сразу. Номера — из таблицы прошивки, имена берутся оттуда же. */
export const COMMON_SPORTS = [9, 1, 2, 28, 19, 43, 4, 25] as const;

export type SportOption = { code: number; name: string };

export function sportOptions(): SportOption[] {
  return COMMON_SPORTS.map((code) => ({ code, name: sportName(code) }));
}

/** Чем помечаем занятие, если человек ничего не выбирал. */
export const DEFAULT_SPORT = 9;
