import { State } from 'react-native-ble-plx';

import { ble, isReady, requestScanPermission, waitForRadio } from '@/core/ble';
import { logger } from '@/core/log/logger';

import { fromBase64 } from './bytes';
import { BAND_NAME, BAND_SERVICE, BAND_SERVICES } from './names';

export type FoundBand = {
  id: string;
  name: string;
  /** Уровень сигнала: чем ближе к нулю, тем ближе устройство. */
  rssi: number;
  /** Адрес из рекламного пакета — браслет отдаёт его до подключения. */
  mac?: string;
  /**
   * Устройство уже связано с телефоном — системой, другим экраном или
   * приложением вендора. Найдено не поиском, поэтому силы сигнала у него нет.
   */
  connected?: boolean;
};

/** Почему поиск не начался. Каждый случай требует своего текста в интерфейсе. */
export type ScanProblem = 'bluetooth-off' | 'no-permission' | 'radio-silent';

export type ScanResult = { ok: true; stop: () => void } | { ok: false; problem: ScanProblem };

/**
 * Браслет кладёт свой адрес в рекламный пакет производителя. На iOS системный
 * адрес приложению недоступен, а этот — виден до подключения, и по нему можно
 * узнать устройство ещё в списке.
 */
function macFromAdvertisement(manufacturerData: string | null): string | undefined {
  if (!manufacturerData) return undefined;

  const bytes = fromBase64(manufacturerData);
  if (bytes.length < 8) return undefined;

  // Первые два байта — код производителя, дальше шесть байт адреса.
  return [...bytes.subarray(2, 8)].map((byte) => byte.toString(16).padStart(2, '0')).join(':');
}

/**
 * Браслеты, уже подключённые к телефону.
 *
 * Поиском их не найти: подключённое устройство перестаёт рекламировать себя, и
 * сканер молчит, сколько его ни держи. Ровно так выглядит браслет, оставшийся
 * на связи с системой или с приложением вендора, — снаружи «его нет», хотя он
 * на руке и работает.
 *
 * Система отдаёт их по службам, которые у устройства есть на самом деле, а не
 * по рекламе, — поэтому спрашиваем весь набор служб браслета.
 */
export async function connectedBands(): Promise<FoundBand[]> {
  const devices = await ble()
    .connectedDevices(BAND_SERVICES)
    .catch((failure: unknown) => {
      logger.warn('band: список подключённых не получен', { reason: String(failure) });
      return [];
    });

  return devices.map((device) => ({
    id: device.id,
    name: device.name ?? device.localName ?? BAND_NAME,
    rssi: 0,
    connected: true,
  }));
}

/**
 * Искать браслеты.
 *
 * Фильтр по сервису задаётся радио, а не проверяется после: иначе в списке
 * оказываются наушники, телевизоры и чужие часы, среди которых свой браслет
 * ещё надо найти. Наше устройство рекламирует сервис `0x5555`, и этого
 * достаточно, чтобы всё лишнее до приложения не доходило.
 *
 * Поиск не останавливается сам: устройство рекламирует себя с паузами и на
 * коротком окне регулярно пропускается. Останавливать должен экран — когда
 * человек выбрал устройство или ушёл.
 */
export async function scanForBands(onFound: (band: FoundBand) => void): Promise<ScanResult> {
  if (!(await requestScanPermission())) return { ok: false, problem: 'no-permission' };

  const manager = ble();
  const state = await waitForRadio();
  if (!isReady(state)) {
    // `Unknown` — это «система не ответила за отведённое время», а не отказ в
    // правах: показывать здесь «нет доступа» значит врать человеку, который
    // доступ только что дал.
    if (state === State.PoweredOff) return { ok: false, problem: 'bluetooth-off' };
    if (state === State.Unknown) return { ok: false, problem: 'radio-silent' };
    return { ok: false, problem: 'no-permission' };
  }

  // Сначала те, что уже на связи: в эфире их не будет, а подключиться к ним
  // можно сразу — им не нужно ждать, пока браслет решит объявить о себе.
  for (const band of await connectedBands()) onFound(band);

  manager.startDeviceScan([BAND_SERVICE], { allowDuplicates: false }, (error, device) => {
    if (error) {
      logger.warn('band: поиск прервался', { reason: error.message });
      return;
    }
    if (!device) return;

    onFound({
      id: device.id,
      // Имя в рекламе бывает пустым, пока устройство не ответит на запрос —
      // с фильтром по сервису это всё равно наш браслет, и прятать его нельзя.
      name: device.name ?? device.localName ?? BAND_NAME,
      rssi: device.rssi ?? -127,
      mac: macFromAdvertisement(device.manufacturerData),
    });
  });

  return { ok: true, stop: () => manager.stopDeviceScan() };
}

/**
 * Ближайшее сверху: браслет на руке всегда громче лежащего в ящике. Уже
 * подключённые идут первыми — силы сигнала у них нет, а связь уже есть.
 */
export function sortByProximity(bands: readonly FoundBand[]): FoundBand[] {
  return [...bands].sort((a, b) => {
    if (a.connected !== b.connected) return a.connected ? -1 : 1;
    return b.rssi - a.rssi;
  });
}

/** Добавить найденное, не плодя дубликатов: устройство попадается несколько раз. */
export function mergeFound(list: readonly FoundBand[], band: FoundBand): FoundBand[] {
  const next = list.filter((item) => item.id !== band.id);
  next.push(band);
  return sortByProximity(next);
}
