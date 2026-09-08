import type { Device } from 'react-native-ble-plx';

/**
 * Чистые правила разбора того, что отдаёт браслет. Всё, что здесь, проверяется
 * тестом: на устройстве эти байты руками не посмотришь.
 */

/** Стандартные службы GATT. Их отдаёт любой браслет, свой протокол — не нужен. */
export const GATT = {
  battery: '0000180f-0000-1000-8000-00805f9b34fb',
  batteryLevel: '00002a19-0000-1000-8000-00805f9b34fb',
  info: '0000180a-0000-1000-8000-00805f9b34fb',
  model: '00002a24-0000-1000-8000-00805f9b34fb',
  firmware: '00002a26-0000-1000-8000-00805f9b34fb',
} as const;

export type Found = { id: string; name: string; rssi: number };

/**
 * Уровень заряда из характеристики 0x2A19 — один байт, процент. Значение
 * приходит в base64: обёртка BLE не знает, что внутри, и не разбирает его.
 */
export function batteryFromGatt(value: string | null): number | null {
  if (!value) return null;
  const byte = atob(value).charCodeAt(0);
  return Number.isFinite(byte) && byte >= 0 && byte <= 100 ? byte : null;
}

/** Строковая характеристика GATT — модель, версия прошивки. */
export function textFromGatt(value: string | null): string | null {
  if (!value) return null;
  const text = atob(value).replace(/\0+$/, '').trim();
  return text === '' ? null : text;
}

/**
 * Найденное — списком, ближайшее сверху: браслет на руке, он всегда сильнее
 * соседского телевизора. Безымянные не показываем: выбрать из десятка строк
 * без названия человек всё равно не сможет.
 *
 * Фильтра «наш браслет» здесь нет намеренно. Его признак — имя в эфире или
 * UUID службы — приходит от поставщика; выдуманный фильтр спрячет из списка
 * ровно тот браслет, который ищут.
 */
export function collect(found: readonly Found[], device: Device): Found[] {
  const name = device.name ?? device.localName;
  if (!name) return [...found];

  const next = found.filter((item) => item.id !== device.id);
  next.push({ id: device.id, name, rssi: device.rssi ?? -127 });
  return next.sort((a, b) => b.rssi - a.rssi);
}
