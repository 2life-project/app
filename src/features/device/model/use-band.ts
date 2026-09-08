import { useCallback, useEffect, useRef, useState } from 'react';
import { State } from 'react-native-ble-plx';

import { ble, isReady, requestScanPermission } from '@/core/ble';
import { logger } from '@/core/log/logger';
import { setPairedBand, usePairedBand } from '@/shared/domain';

import { batteryFromGatt, collect, GATT, textFromGatt, type Found } from './band';

const SCAN_SECONDS = 12;

export type BandLink = {
  /** Что удалось прочитать у привязанного браслета по стандартным службам. */
  battery: number | null;
  model: string | null;
  firmware: string | null;
  connected: boolean;
};

/**
 * Привязка и связь с браслетом. Одно место на обе задачи: пока браслета нет —
 * это поиск, когда есть — это связь с ним, и состояние у них общее.
 *
 * Синхронизации измерений здесь нет: стандартные службы GATT отдают заряд и
 * модель, а шаги, сон и пульс живут в протоколе производителя, которого у нас
 * пока нет. Показывать пустые кольца как «данные с браслета» — врать.
 */
export function useBand() {
  const paired = usePairedBand();
  const [radio, setRadio] = useState<State>(State.Unknown);
  const [scanning, setScanning] = useState(false);
  const [found, setFound] = useState<readonly Found[]>([]);
  const [link, setLink] = useState<BandLink>(EMPTY_LINK);
  const [error, setError] = useState<string | null>(null);
  /** Таймер остановки поиска: его надо снять при уходе с экрана. */
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Состояние радио читаем подпиской, а не разово: человек включает Bluetooth
  // прямо на этом экране, и список должен ожить сам.
  useEffect(() => {
    const subscription = ble().onStateChange(setRadio, true);
    return () => subscription.remove();
  }, []);

  const scan = useCallback(async () => {
    setError(null);
    setFound([]);

    if (!(await requestScanPermission())) {
      setError('permission');
      return;
    }

    setScanning(true);
    ble().startDeviceScan(null, { allowDuplicates: false }, (failure, device) => {
      if (failure) {
        logger.warn('Поиск браслета не удался', { failure });
        setError('scan');
        setScanning(false);
        return;
      }
      if (device) setFound((current) => collect(current, device));
    });

    // Поиск сам себя останавливает: работающий радиоприёмник ест батарею
    // телефона, а браслет находится за секунды.
    timer.current = setTimeout(() => {
      ble().stopDeviceScan();
      setScanning(false);
    }, SCAN_SECONDS * 1000);
  }, []);

  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    ble().stopDeviceScan();
    setScanning(false);
  }, []);

  // Уходя с экрана, гасим радио: работающий приёмник ест батарею телефона, а
  // сработавший позже таймер трогал бы состояние размонтированного экрана.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      ble().stopDeviceScan();
    },
    [],
  );

  const pair = useCallback(
    async (device: Found) => {
      stop();
      setError(null);
      try {
        // Признака нашего браслета в эфире мы не знаем, поэтому в списке
        // видно всё подряд — телевизор, наушники, весы. Убедиться, что это
        // носимое устройство, можно только спросив его: браслет отдаёт заряд
        // по стандартной службе, а телевизор — нет. Без этой проверки в
        // Keychain лёг бы чужой прибор, и Главная сказала бы «браслет
        // привязан».
        const link = await read(device.id);
        if (link.battery === null) {
          logger.error('Устройство не похоже на браслет', { id: device.id, name: device.name });
          setError('notBand');
          return;
        }
        setPairedBand({ id: device.id, name: device.name, pairedAt: new Date().toISOString() });
        setLink(link);
      } catch (failure) {
        logger.error('Не подключились к браслету', { id: device.id, failure });
        setError('connect');
      }
    },
    [stop],
  );

  const forget = useCallback(() => {
    if (paired)
      void ble()
        .cancelDeviceConnection(paired.id)
        .catch(() => undefined);
    setPairedBand(null);
    setLink(EMPTY_LINK);
  }, [paired]);

  // Подключаемся к запомненному браслету, когда экран открыт и радио готово.
  useEffect(() => {
    if (!paired || !isReady(radio)) return;
    let alive = true;

    void read(paired.id)
      .then((next) => {
        if (alive) setLink(next);
      })
      .catch((failure: unknown) => {
        logger.warn('Браслет не ответил', { id: paired.id, failure });
        if (alive) setLink(EMPTY_LINK);
      });

    return () => {
      alive = false;
    };
  }, [paired, radio]);

  return {
    paired,
    link,
    found,
    scanning,
    error,
    ready: isReady(radio),
    /** Радио ещё не ответило: показывать «выключен» рано. */
    unknown: radio === State.Unknown,
    scan,
    stop,
    pair,
    forget,
  };
}

const EMPTY_LINK: BandLink = { battery: null, model: null, firmware: null, connected: false };

/** Что можно спросить у любого браслета, не зная его протокола. */
async function read(id: string): Promise<BandLink> {
  const device = await ble().connectToDevice(id);
  await device.discoverAllServicesAndCharacteristics();

  const [battery, model, firmware] = await Promise.all([
    characteristic(device, GATT.battery, GATT.batteryLevel),
    characteristic(device, GATT.info, GATT.model),
    characteristic(device, GATT.info, GATT.firmware),
  ]);

  return {
    connected: true,
    battery: batteryFromGatt(battery),
    model: textFromGatt(model),
    firmware: textFromGatt(firmware),
  };
}

/**
 * Необязательная характеристика: половина браслетов не отдаёт модель и версию.
 * Её отсутствие — не сбой связи, поэтому глушим до `null` поштучно, а не
 * роняем всё чтение.
 */
async function characteristic(
  device: Awaited<ReturnType<ReturnType<typeof ble>['connectToDevice']>>,
  service: string,
  id: string,
): Promise<string | null> {
  try {
    const value = await device.readCharacteristicForService(service, id);
    return value.value;
  } catch {
    return null;
  }
}
