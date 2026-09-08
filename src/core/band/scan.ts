import { State } from 'react-native-ble-plx';

import { ble, isReady, requestScanPermission } from '@/core/ble';
import { logger } from '@/core/log/logger';

import { BAND_NAME } from './names';

export type FoundBand = {
  id: string;
  name: string;
  /** Уровень сигнала: чем ближе к нулю, тем ближе устройство. */
  rssi: number;
  /** Адрес из рекламного пакета — браслет отдаёт его до подключения. */
  mac?: string;
};

/** Почему поиск не начался. Каждый случай требует своего текста в интерфейсе. */
export type ScanProblem = 'bluetooth-off' | 'no-permission';

export type ScanResult = { ok: true; stop: () => void } | { ok: false; problem: ScanProblem };

/**
 * Браслет кладёт свой адрес в рекламный пакет производителя. На iOS системный
 * адрес приложению недоступен, а этот — виден до подключения, и по нему можно
 * узнать устройство ещё в списке.
 */
function macFromAdvertisement(manufacturerData: string | null): string | undefined {
  if (!manufacturerData) return undefined;

  const bytes = Uint8Array.from(Buffer.from(manufacturerData, 'base64'));
  if (bytes.length < 8) return undefined;

  // Первые два байта — код производителя, дальше шесть байт адреса.
  return [...bytes.subarray(2, 8)].map((byte) => byte.toString(16).padStart(2, '0')).join(':');
}

/**
 * Искать браслеты.
 *
 * Поиск не останавливается сам: устройство рекламирует себя с паузами и на
 * коротком окне регулярно пропускается. Останавливать должен экран — когда
 * человек выбрал устройство или ушёл.
 */
export async function scanForBands(onFound: (band: FoundBand) => void): Promise<ScanResult> {
  if (!(await requestScanPermission())) return { ok: false, problem: 'no-permission' };

  const manager = ble();
  const state = await manager.state();
  if (!isReady(state)) {
    return { ok: false, problem: state === State.PoweredOff ? 'bluetooth-off' : 'no-permission' };
  }

  manager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
    if (error) {
      logger.warn('band: поиск прервался', { reason: error.message });
      return;
    }

    const name = device?.name ?? device?.localName;
    if (!device || !name) return;

    onFound({
      id: device.id,
      name,
      rssi: device.rssi ?? -127,
      mac: macFromAdvertisement(device.manufacturerData),
    });
  });

  return { ok: true, stop: () => manager.stopDeviceScan() };
}

/** Наш браслет среди найденного. Остальные устройства показываем ниже списком. */
export function isOurBand(band: FoundBand): boolean {
  return band.name.toUpperCase().startsWith(BAND_NAME);
}

/** Ближайшее сверху: браслет на руке всегда громче соседского телевизора. */
export function sortByProximity(bands: readonly FoundBand[]): FoundBand[] {
  return [...bands].sort((a, b) => {
    if (isOurBand(a) !== isOurBand(b)) return isOurBand(a) ? -1 : 1;
    return b.rssi - a.rssi;
  });
}

/** Добавить найденное, не плодя дубликатов: устройство попадается несколько раз. */
export function mergeFound(list: readonly FoundBand[], band: FoundBand): FoundBand[] {
  const next = list.filter((item) => item.id !== band.id);
  next.push(band);
  return sortByProximity(next);
}
