import type Feather from '@expo/vector-icons/Feather';

import type { Tone } from '@/shared/theme';

type IconName = keyof typeof Feather.glyphMap;

/**
 * Содержимое настроек из макета. Устройства и значения приедут с сервера —
 * пока это тот же состав и те же формулировки, что в эталоне.
 */
export const PROFILE = {
  initials: 'AN',
  name: 'Anatoly',
  since: 'with 2Life since March 2026',
  plan: '2LIFE+',
} as const;

type Row = {
  id: string;
  /** Что открывает строка: экран источника, шит выбора или другой раздел. */
  opens?: 'device' | 'choice' | 'records' | 'confirm';
  icon: IconName;
  tone?: Tone;
  title: string;
  /** Цвет заголовка: выход из аккаунта — необратимое действие, и это видно. */
  titleTone?: Tone;
  subtitle?: string;
  value?: string;
  /** Точка справа: источник на связи. Цветом кодируется состояние, не тип. */
  connected?: boolean;
};

export const DEVICES: readonly Row[] = [
  {
    id: 'whoop',
    opens: 'device',
    icon: 'watch',
    tone: 'success',
    title: 'Whoop',
    subtitle: 'HRV, training load, resting HR · today, 07:42',
    connected: true,
  },
  {
    id: 'oura',
    opens: 'device',
    icon: 'circle',
    tone: 'accent',
    title: 'Oura',
    subtitle: 'Sleep, temperature · today, 06:58',
    connected: true,
  },
  {
    id: 'withings',
    opens: 'device',
    icon: 'cloud',
    title: 'Withings',
    subtitle: 'Body composition, weight, pressure · today, 06:15',
    connected: true,
  },
  {
    id: 'polar',
    opens: 'device',
    icon: 'clock',
    tone: 'warning',
    title: 'Polar',
    subtitle: 'Sleep, training · yesterday, 22:10',
    connected: true,
  },
  {
    id: 'health',
    opens: 'device',
    icon: 'heart',
    title: 'Apple Health',
    subtitle: 'Connected',
    connected: true,
  },
];

export const ADD_DEVICE: Row = {
  id: 'add',
  opens: 'choice',
  icon: 'plus',
  tone: 'accent',
  title: 'Add a device',
};

export const APP_ROWS: readonly Row[] = [
  {
    id: 'notifications',
    opens: 'choice',
    icon: 'bell',
    tone: 'warning',
    title: 'Notifications',
    subtitle: 'Evening check-in · 21:00',
    value: 'On',
  },
  {
    id: 'units',
    opens: 'choice',
    icon: 'sliders',
    tone: 'accent',
    title: 'Units',
    value: 'Metric',
  },
  {
    id: 'language',
    opens: 'choice',
    icon: 'globe',
    tone: 'accent',
    title: 'Language',
    value: 'English',
  },
];

export const DATA_ROWS: readonly Row[] = [
  {
    id: 'export',
    opens: 'choice',
    icon: 'download',
    tone: 'accent',
    title: 'Data export',
    subtitle: 'All metrics and documents',
  },
  {
    id: 'upload',
    opens: 'records',
    icon: 'file-text',
    title: 'Document upload',
    subtitle: 'Add a document — in the web version',
  },
];

export const SIGN_OUT: Row = {
  id: 'sign-out',
  opens: 'confirm',
  icon: 'log-out',
  tone: 'danger',
  titleTone: 'danger',
  title: 'Sign out',
};

export const RESET: Row = {
  id: 'reset',
  opens: 'confirm',
  icon: 'rotate-ccw',
  tone: 'warning',
  title: 'Reset the mockup',
  subtitle: 'back to the state of a first launch',
};

export const RESET_CONFIRM = {
  title: 'Reset the mockup?',
  text: 'Everything the app remembers on this phone — marks, answers, chosen settings — goes back to how it looks on a first launch.',
};

export const VERSION = '2Life · 0.4 core';

export type SettingsRow = Row;

/** Варианты выбора для строк, которые открывают шит. */
export const SETTINGS_CHOICES: Record<
  string,
  { title: string; options: readonly { id: string; title: string; subtitle?: string }[] }
> = {
  add: {
    title: 'Add a device',
    options: [
      { id: 'band', title: '2Life band', subtitle: 'battery, sensors and voice notes live here' },
      { id: 'whoop', title: 'Whoop', subtitle: 'through your Whoop account' },
      { id: 'oura', title: 'Oura', subtitle: 'through your Oura account' },
      { id: 'withings', title: 'Withings', subtitle: 'scales and pressure cuff' },
    ],
  },
  notifications: {
    title: 'Evening check-in',
    options: [
      { id: '20', title: '20:00' },
      { id: '21', title: '21:00', subtitle: 'now' },
      { id: '22', title: '22:00' },
      { id: 'off', title: 'Off', subtitle: 'the day stays empty unless you open it yourself' },
    ],
  },
  units: {
    title: 'Units',
    options: [
      { id: 'metric', title: 'Metric', subtitle: 'kg, cm, °C' },
      { id: 'imperial', title: 'Imperial', subtitle: 'lb, in, °F' },
    ],
  },
  language: {
    title: 'Language',
    options: [
      { id: 'en', title: 'English' },
      { id: 'ru', title: 'Русский' },
    ],
  },
  export: {
    title: 'Data export',
    options: [
      { id: 'csv', title: 'CSV', subtitle: 'every metric, one file per source' },
      { id: 'pdf', title: 'PDF for a doctor', subtitle: 'a summary of the last 90 days' },
      { id: 'json', title: 'JSON', subtitle: 'everything, including raw series' },
    ],
  },
};

export const SIGN_OUT_CONFIRM = {
  title: 'Sign out?',
  text: 'The data stays on the server — signing back in brings it all back to this phone.',
};
