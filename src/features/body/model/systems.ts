import type { VitalGroup } from '@/shared/domain';

/**
 * Четыре системы тела по единому шаблону. Содержимое из макета: у каждой своё
 * кольцо, сводка, живые показатели и два графика.
 */
/** Источник данных не один — обещать «с браслета» было бы неправдой. */
export const BODY_SUBTITLE = 'from your devices and records';

export const BODY_SECTIONS = [
  { value: 'heart', label: 'Heart and vessels' },
  { value: 'breathing', label: 'Breathing' },
  { value: 'recovery', label: 'Recovery' },
  { value: 'composition', label: 'Body composition' },
] as const;

export type BodySection = (typeof BODY_SECTIONS)[number]['value'];

export const NO_DATA = {
  title: 'Nothing measured here yet',
  text: 'These numbers come from a worn device, a connected tracker or your own entry — whichever you have.',
  connect: 'Connect a device',
  manual: 'Enter a measurement by hand',
} as const;

/**
 * Какая группа показаний браслета относится к системе.
 *
 * Состав тела браслету неизвестен: вес и доли человек вводит сам или получает
 * с весов, а устройство их не меряет — подставлять туда что-то с руки нельзя.
 */
export function bandGroupOf(section: string): VitalGroup | null {
  if (section === 'heart') return 'heart';
  if (section === 'breathing') return 'breathing';
  if (section === 'recovery') return 'recovery';
  return null;
}
