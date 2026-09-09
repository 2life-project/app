import { BleError, BleErrorCode, type Device } from 'react-native-ble-plx';

import { ble, isReady, waitForRadio } from '@/core/ble';
import { env } from '@/core/config/env';
import { logger } from '@/core/log/logger';

import { BandTransport } from './transport';

/**
 * Установка и разрыв связи с браслетом. Отделено от самого транспорта: тот
 * отвечает за разговор с уже подключённым устройством, а здесь — как оно
 * подключается и как отпускается.
 */

/** Подключиться к устройству и договориться о размере пакета. */
export async function connectTransport(deviceId: string): Promise<BandTransport> {
  const manager = ble();

  // Сразу после запуска приложения состояние радио — `Unknown`: система ещё не
  // ответила. Подключаться в этот момент бессмысленно, и именно так падало
  // автоподключение к запомненному браслету на каждом холодном старте.
  const state = await waitForRadio();
  if (!isReady(state)) throw new Error(`band: Bluetooth недоступен (${state})`);

  // Браслет мог быть подключён и без нас: другим экраном или приложением
  // вендора. Соединение системное и общее, но `connectToDevice` на уже
  // открытом падает — тогда просто берём устройство из известных.
  const device = await manager
    .connectToDevice(deviceId, { requestMTU: 247 })
    .catch(async (failure: unknown) => {
      if (
        !(failure instanceof BleError) ||
        failure.errorCode !== BleErrorCode.DeviceAlreadyConnected
      ) {
        throw failure;
      }
      return (await manager.devices([deviceId]))[0];
    });
  if (!device) throw new Error(`band: устройство ${deviceId} потерялось при подключении`);

  await device.discoverAllServicesAndCharacteristics();

  // Опись — только в разработке: она обходит каждый сервис и каждую
  // характеристику отдельным запросом по радио, и в релизе это чистая задержка
  // перед первым показанием ради лога, которого всё равно никто не увидит.
  if (env.isDev) await describe(device);

  const transport = new BandTransport(device);
  await transport.start();
  return transport;
}

/**
 * Разорвать связь с браслетом, когда транспорта на руках нет.
 *
 * Нужна отдельно от `stop`: связь мог держать другой экран или прошлый запуск,
 * а отвязать устройство надо и в этом случае.
 */
export async function dropConnection(deviceId: string): Promise<void> {
  await ble()
    .cancelDeviceConnection(deviceId)
    .catch((failure: unknown) => {
      logger.warn('band: связь не разорвалась', { deviceId, reason: String(failure) });
    });
}

/**
 * Что у устройства на самом деле есть. Без этого молчащий канал неотличим от
 * молчащего браслета: обе картины выглядят как «команда не ответила».
 */
async function describe(device: Device): Promise<void> {
  const services = await device.services();
  for (const service of services) {
    const characteristics = await service.characteristics();
    logger.debug('band gatt', {
      service: service.uuid,
      characteristics: characteristics.map((item) => ({
        uuid: item.uuid,
        notify: item.isNotifiable,
        indicate: item.isIndicatable,
        write: item.isWritableWithResponse,
        writeNoResponse: item.isWritableWithoutResponse,
      })),
    });
  }
}
