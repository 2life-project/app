import type { FeatureName } from '../api';
import type { BandSettings, DeviceSettings, Threshold } from '../api/settings';

/**
 * Настройки устройства, описанные списком, а не разложенные по экрану руками.
 *
 * Каждая настройка знает три вещи: как её прочитать из ответа устройства, как
 * записать обратно и какой возможностью она обеспечена. Двадцать написанных
 * вручную строк интерфейса разъезжались бы с драйвером на каждой правке — и
 * молча, потому что неподдержанное поле устройство подтверждает пустым эхом.
 *
 * Чего здесь нет намеренно: язык и таймаут экрана. У ES100 экрана нет, и обе
 * настройки на нём ни на что не влияют — показывать их значит предлагать
 * покрутить то, что никуда не подключено.
 */

/** Что показывает и меняет одна строка настроек. */
export type SettingItem =
  | {
      kind: 'toggle';
      id: string;
      title: string;
      note: string;
      feature?: FeatureName;
      read: (settings: DeviceSettings) => boolean | undefined;
      write: (api: BandSettings, on: boolean) => Promise<void>;
    }
  | {
      kind: 'interval';
      id: string;
      title: string;
      note: string;
      feature?: FeatureName;
      options: readonly number[];
      read: (settings: DeviceSettings) => number | undefined;
      write: (api: BandSettings, minutes: number) => Promise<void>;
    }
  | {
      kind: 'threshold';
      id: string;
      title: string;
      note: string;
      unit: string;
      range: { min: number; max: number };
      feature?: FeatureName;
      read: (
        settings: DeviceSettings,
      ) => Threshold | { enabled: boolean; percent: number } | undefined;
      write: (api: BandSettings, enabled: boolean, value: number) => Promise<void>;
    };

export type SettingGroup = { id: string; caption: string; note?: string; items: SettingItem[] };

/** Наборы интервалов. Реже — реже радио и меньше расход, чаще — плотнее ряд. */
const MINUTES = [1, 5, 10, 30, 60] as const;
const LONG_MINUTES = [5, 10, 30, 60, 120] as const;

export const SETTING_GROUPS: readonly SettingGroup[] = [
  {
    id: 'measure',
    caption: 'WHAT THE BAND MEASURES ON ITS OWN',
    note: 'Every automatic reading turns the optical sensor on. More often means a denser chart and a shorter run between charges.',
    items: [
      {
        kind: 'toggle',
        id: 'continuousHeartRate',
        title: 'Continuous heart rate',
        note: 'Keeps measuring through the day instead of on request.',
        read: (settings) => settings.continuousHeartRate,
        write: (api, on) => api.setContinuousHeartRate(on),
      },
      {
        kind: 'interval',
        id: 'heartRateInterval',
        title: 'Heart rate every',
        note: 'How often the band takes a reading.',
        options: MINUTES,
        read: (settings) => settings.heartRateInterval,
        write: (api, minutes) => api.setHeartRateInterval(minutes),
      },
      {
        kind: 'toggle',
        id: 'continuousOxygen',
        title: 'Continuous blood oxygen',
        note: 'On the wrist it is reliable at rest — the night trend is what it is for.',
        read: (settings) => settings.continuousOxygen,
        write: (api, on) => api.setContinuousOxygen(on),
      },
      {
        kind: 'interval',
        id: 'oxygenInterval',
        title: 'Blood oxygen every',
        note: 'How often the band takes a reading.',
        options: LONG_MINUTES,
        read: (settings) => settings.oxygenInterval,
        write: (api, minutes) => api.setOxygenInterval(minutes),
      },
      {
        kind: 'toggle',
        id: 'autoStress',
        title: 'Automatic stress',
        note: 'Derived from heart rate variability, not measured directly.',
        read: (settings) => settings.autoStress,
        write: (api, on) => api.setAutoStress(on, 10),
      },
      {
        kind: 'interval',
        id: 'stressInterval',
        title: 'Stress every',
        note: 'How often the band works it out.',
        options: LONG_MINUTES,
        read: (settings) => settings.stressInterval,
        write: (api, minutes) => api.setAutoStress(true, minutes),
      },
      {
        kind: 'toggle',
        id: 'autoBloodPressure',
        title: 'Automatic blood pressure',
        note: 'An optical estimate without a cuff. Treat it as a trend, never as a diagnosis.',
        feature: 'bloodPressure',
        read: (settings) => settings.autoBloodPressure,
        write: (api, on) => api.setAutoBloodPressure(on),
      },
      {
        kind: 'interval',
        id: 'bloodPressureInterval',
        title: 'Blood pressure every',
        note: 'How often the band takes a reading.',
        feature: 'bloodPressure',
        options: LONG_MINUTES,
        read: (settings) => settings.bloodPressureInterval,
        write: (api, minutes) => api.setBloodPressureInterval(minutes),
      },
    ],
  },
  {
    id: 'alerts',
    caption: 'ALERTS ON THE WRIST',
    note: 'The band has no screen: an alert reaches you as vibration. It cannot tell you which one it was.',
    items: [
      {
        kind: 'threshold',
        id: 'heartRateHighLimit',
        title: 'Buzz above',
        note: 'When the heart rate stays over this while you are still.',
        unit: 'bpm',
        range: { min: 100, max: 200 },
        read: (settings) => settings.heartRateHighLimit,
        write: (api, enabled, value) => api.setHeartRateHighLimit(enabled, value),
      },
      {
        kind: 'threshold',
        id: 'heartRateLowLimit',
        title: 'Buzz below',
        note: 'A resting rate under this is worth noticing.',
        unit: 'bpm',
        range: { min: 30, max: 60 },
        read: (settings) => settings.heartRateLowLimit,
        write: (api, enabled, value) => api.setHeartRateLowLimit(enabled, value),
      },
      {
        kind: 'threshold',
        id: 'oxygenLowLimit',
        title: 'Buzz on low oxygen',
        note: 'Below this share of oxygen in the blood.',
        unit: '%',
        range: { min: 85, max: 95 },
        read: (settings) => settings.oxygenLowLimit,
        write: (api, enabled, value) => api.setOxygenLowLimit(enabled, value),
      },
    ],
  },
  {
    id: 'units',
    caption: 'UNITS',
    items: [
      {
        kind: 'toggle',
        id: 'metricLength',
        title: 'Metric distance',
        note: 'Kilometres and metres instead of miles.',
        read: (settings) => settings.metricLength,
        write: (api, on) => api.setLengthUnits(on),
      },
    ],
  },
];

/** Значение порога наружу: у пульса и кислорода разные имена одного и того же поля. */
export function thresholdValue(
  value: Threshold | { enabled: boolean; percent: number } | undefined,
): { enabled: boolean; amount: number } | undefined {
  if (!value) return undefined;
  return { enabled: value.enabled, amount: 'bpm' in value ? value.bpm : value.percent };
}

/** Что показывать на этом устройстве: маска возможностей решает, а не наш список. */
export function visibleGroups(supported: readonly FeatureName[]): SettingGroup[] {
  return SETTING_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.feature || supported.includes(item.feature)),
  })).filter((group) => group.items.length > 0);
}

/**
 * Что сделать по нажатию: команда устройству и то, как от неё изменится ответ.
 *
 * Оптимистичная правка собирается здесь, потому что здесь же лежит знание,
 * каким полем настройка возвращается с устройства: у порога пульса это `bpm`,
 * у порога кислорода — `percent`, а поле в ответе называется по имени
 * настройки. Разложить это по компонентам значит развести знание о протоколе
 * по интерфейсу.
 */
export function writeOf(
  item: SettingItem,
  next: { on?: boolean; amount?: number },
): { run: (api: BandSettings) => Promise<void>; optimistic: Partial<DeviceSettings> } {
  if (item.kind === 'toggle') {
    const on = next.on ?? false;
    return { run: (api) => item.write(api, on), optimistic: { [item.id]: on } };
  }

  if (item.kind === 'interval') {
    const minutes = next.amount ?? item.options[0] ?? 1;
    return { run: (api) => item.write(api, minutes), optimistic: { [item.id]: minutes } };
  }

  const enabled = next.on ?? false;
  const amount = next.amount ?? item.range.min;
  const value = item.unit === '%' ? { enabled, percent: amount } : { enabled, bpm: amount };

  return { run: (api) => item.write(api, enabled, amount), optimistic: { [item.id]: value } };
}
