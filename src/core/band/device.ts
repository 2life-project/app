import { be16, byteAt } from './bytes';
import { field, intField, parseModal, parseTagged, toAscii, toDate } from './tlv';

/** Паспорт устройства из ответа на запрос всех полей группы информации. */
export type DeviceInfo = {
  mac?: string;
  /** Внутреннее имя платформы, у ES100 — `NAL-WB00`. */
  platform?: string;
  hardware?: string;
  firmware?: string;
  protocol?: string;
  system?: string;
  serial?: string;
  battery?: BatteryState;
};

export type BatteryState = {
  /** Заряд в процентах. */
  level: number;
  charging: boolean;
  lowBatteryAlert: boolean;
};

const InfoTag = {
  mac: 0x01,
  platform: 0x02,
  hardware: 0x03,
  firmware: 0x08,
  model: 0x0d,
  protocol: 0x13,
  system: 0x15,
  battery: 0x16,
} as const;

export function decodeDeviceInfo(body: Uint8Array): DeviceInfo {
  const fields = parseModal(body);
  const battery = field(fields, InfoTag.battery);

  return {
    mac: formatMac(field(fields, InfoTag.mac)),
    platform: toAscii(field(fields, InfoTag.platform)),
    hardware: toAscii(field(fields, InfoTag.hardware)),
    firmware: toAscii(field(fields, InfoTag.firmware)),
    protocol: toAscii(field(fields, InfoTag.protocol)),
    system: toAscii(field(fields, InfoTag.system)),
    serial: toAscii(field(fields, 0x14)),
    battery: battery ? decodeBattery(battery) : undefined,
  };
}

export function decodeBattery(body: Uint8Array): BatteryState {
  const fields = parseTagged(body);
  return {
    level: intField(fields, 0x01) ?? 0,
    charging: (intField(fields, 0x02) ?? 0) !== 0,
    lowBatteryAlert: (intField(fields, 0x07) ?? 0) !== 0,
  };
}

/** Время на устройстве. Расходится с телефоном после потери связи. */
export function decodeTime(body: Uint8Array): Date | undefined {
  return toDate(field(parseTagged(body), 0x01));
}

function formatMac(value: Uint8Array | undefined): string | undefined {
  if (!value || value.length !== 6) return undefined;
  return [...value].map((byte) => byte.toString(16).padStart(2, '0')).join(':');
}

/**
 * Возможности устройства.
 *
 * Браслет сам перечисляет, что умеет: тринадцать битовых списков, которые
 * читаются из двух характеристик. Это надёжнее перебора команд — на
 * неподдержанное поле устройство отвечает пустым эхом, неотличимым от ответа
 * без данных.
 *
 * Списки нарезаются с конца по три байта: последняя тройка — первый список.
 */
export type Capabilities = {
  lists: number[];
  /** Максимальный размер пакета, о котором договорилось устройство. */
  maxPacket: number;
  has: (list: number, bit: number) => boolean;
};

/** Флаги, которые влияют на поведение приложения. */
export const Feature = {
  /** Экрана нет: уведомления сводятся к вибрации, циферблаты бессмысленны. */
  noScreen: { list: 4, bit: 0x100 },
  /** Звонки по Bluetooth Classic не поддерживаются. */
  noBluetoothCall: { list: 4, bit: 0x80 },
  audioRecorder: { list: 4, bit: 0x100000 },
  heartRateVariability: { list: 4, bit: 0x800 },
  bloodPressure: { list: 2, bit: 0x40000 },
  mood: { list: 2, bit: 0x80000 },
  extendedAlarms: { list: 3, bit: 0x800000 },
  temperature: { list: 4, bit: 0x200 },
  music: { list: 4, bit: 0x40 },
  offlineVoice: { list: 4, bit: 0x400000 },
  speechToText: { list: 5, bit: 0x4 },
  chatGpt: { list: 2, bit: 0x200000 },
  gps: { list: 1, bit: 0x100 },
  /** Расширенный формат истории: меняет номер поля в запросе счётчика кадров. */
  extendedHistory: { list: 2, bit: 0x20000 },
} as const;

export type FeatureName = keyof typeof Feature;

/**
 * Разобрать маски. `low` — характеристика со списками 1–7, `high` — со списками
 * 8–13, причём её первые два байта заняты размером пакета.
 */
export function decodeCapabilities(low: Uint8Array, high: Uint8Array): Capabilities {
  const lists = new Array<number>(14).fill(0);

  for (let index = 0; index < 6; index += 1) {
    lists[index + 1] = readTail(low, index);
    lists[index + 8] = readTail(high, index);
  }
  // Седьмой список лежит отдельно — в первых двух байтах младшей характеристики.
  lists[7] = be16(low, 0) ?? 0;

  const maxPacket = be16(high, 0) ?? 0;

  return {
    lists,
    maxPacket,
    has: (list, bit) => ((lists[list] ?? 0) & bit) === bit,
  };
}

/** Список номер `index` от конца буфера: тройки байт идут в обратном порядке. */
function readTail(source: Uint8Array, index: number): number {
  const end = source.length - 3 * index;
  if (end < 3) return 0;
  return (byteAt(source, end - 3) << 16) | (byteAt(source, end - 2) << 8) | byteAt(source, end - 1);
}

export function supports(capabilities: Capabilities, name: FeatureName): boolean {
  const feature = Feature[name];
  return capabilities.has(feature.list, feature.bit);
}
