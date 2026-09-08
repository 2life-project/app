import type { Device } from 'react-native-ble-plx';

import { batteryFromGatt, collect, textFromGatt, type Found } from './band';

const device = (extra: Partial<Device>) => extra as Device;

describe('batteryFromGatt', () => {
  it('читает процент из одного байта', () => {
    expect(batteryFromGatt(btoa('\x4c'))).toBe(76);
    expect(batteryFromGatt(btoa('\x64'))).toBe(100);
  });

  it('не выдумывает заряд, когда его нет или он вне шкалы', () => {
    expect(batteryFromGatt(null)).toBeNull();
    expect(batteryFromGatt('')).toBeNull();
    expect(batteryFromGatt(btoa('\xff'))).toBeNull();
  });
});

describe('textFromGatt', () => {
  it('снимает добивку нулями, которой заканчивают строки в GATT', () => {
    expect(textFromGatt(btoa('ES100\0\0'))).toBe('ES100');
  });

  it('пустую строку возвращает как отсутствие, а не как пустое имя', () => {
    expect(textFromGatt(btoa('\0\0'))).toBeNull();
    expect(textFromGatt(null)).toBeNull();
  });
});

describe('collect', () => {
  const found: Found[] = [{ id: 'a', name: 'Далёкий', rssi: -90 }];

  it('ближайшее оказывается сверху: браслет на руке сильнее соседей', () => {
    const next = collect(found, device({ id: 'b', name: 'ES100', rssi: -45 }));
    expect(next.map((item) => item.name)).toEqual(['ES100', 'Далёкий']);
  });

  it('повторное объявление обновляет строку, а не удваивает её', () => {
    const next = collect(found, device({ id: 'a', name: 'Далёкий', rssi: -50 }));
    expect(next).toHaveLength(1);
    expect(next[0]?.rssi).toBe(-50);
  });

  it('безымянное в список не попадает — выбрать из таких нельзя', () => {
    expect(collect(found, device({ id: 'c', rssi: -40 }))).toEqual(found);
  });

  it('берёт localName, когда имени в ответе на запрос ещё нет', () => {
    const next = collect([], device({ id: 'd', localName: 'ES100', rssi: -40 }));
    expect(next[0]?.name).toBe('ES100');
  });
});
