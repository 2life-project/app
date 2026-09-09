/**
 * Восстановление дат при чтении из хранилища.
 *
 * JSON не знает дат: без этого время замера приезжает с диска строкой, а на нём
 * считаются графики и границы суток. Правило одно на снимок раздела и на архив
 * суток — разъедься оно, один из них молча начал бы сравнивать строки.
 */
const ISO = /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/;

export function reviveDates(_key: string, value: unknown): unknown {
  return typeof value === 'string' && ISO.test(value) ? new Date(value) : value;
}
