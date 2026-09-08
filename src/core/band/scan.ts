import { State } from 'react-native-ble-plx';

import { ble, isReady, requestScanPermission } from '@/core/ble';
import { logger } from '@/core/log/logger';

import { fromBase64 } from './bytes';
import { BAND_NAME, BAND_SERVICE } from './names';

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

  const bytes = fromBase64(manufacturerData);
  if (bytes.length < 8) return undefined;

  // Первые два байта — код производителя, дальше шесть байт адреса.
  return [...bytes.subarray(2, 8)].map((byte) => byte.toString(16).padStart(2, '0')).join(':');
}

/**
 * Сколько ждать, пока поднимется стек Bluetooth.
 *
 * Сразу после запуска приложения и сразу после выдачи разрешения состояние
 * радио — `Unknown`: система ещё не ответила. Если принять это за отказ, человек
 * увидит «нет доступа» ровно в тот момент, когда доступ только что дал.
 */
const STATE_TIMEOUT_MS = 5000;

function waitForState(manager: ReturnType<typeof ble>): Promise<State> {
  return new Promise((resolve) => {
    const subscription = manager.onStateChange((state) => {
      if (state === State.Unknown || state === State.Resetting) return;
      subscription.remove();
      resolve(state);
    }, true);

    setTimeout(() => {
      subscription.remove();
      resolve(State.Unknown);
    }, STATE_TIMEOUT_MS);
  });
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
  const state = await waitForState(manager);
  if (!isReady(state)) {
    return { ok: false, problem: state === State.PoweredOff ? 'bluetooth-off' : 'no-permission' };
  }

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

/** Ближайшее сверху: браслет на руке всегда громче лежащего в ящике. */
export function sortByProximity(bands: readonly FoundBand[]): FoundBand[] {
  return [...bands].sort((a, b) => b.rssi - a.rssi);
}

/** Добавить найденное, не плодя дубликатов: устройство попадается несколько раз. */
export function mergeFound(list: readonly FoundBand[], band: FoundBand): FoundBand[] {
  const next = list.filter((item) => item.id !== band.id);
  next.push(band);
  return sortByProximity(next);
}
