import type { Tone } from '@/shared/theme';

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
  icon:
    | 'watch'
    | 'circle'
    | 'cloud'
    | 'clock'
    | 'heart'
    | 'plus'
    | 'bell'
    | 'sliders'
    | 'globe'
    | 'download'
    | 'file-text'
    | 'log-out';
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
    icon: 'watch',
    tone: 'success',
    title: 'Whoop',
    subtitle: 'HRV, training load, resting HR · today, 07:42',
    connected: true,
  },
  {
    id: 'oura',
    icon: 'circle',
    tone: 'accent',
    title: 'Oura',
    subtitle: 'Sleep, temperature · today, 06:58',
    connected: true,
  },
  {
    id: 'withings',
    icon: 'cloud',
    title: 'Withings',
    subtitle: 'Body composition, weight, pressure · today, 06:15',
    connected: true,
  },
  {
    id: 'polar',
    icon: 'clock',
    tone: 'warning',
    title: 'Polar',
    subtitle: 'Sleep, training · yesterday, 22:10',
    connected: true,
  },
  { id: 'health', icon: 'heart', title: 'Apple Health', subtitle: 'Connected', connected: true },
];

export const ADD_DEVICE: Row = {
  id: 'add',
  icon: 'plus',
  tone: 'accent',
  title: 'Add a device',
};

export const APP_ROWS: readonly Row[] = [
  {
    id: 'notifications',
    icon: 'bell',
    tone: 'warning',
    title: 'Notifications',
    subtitle: 'Evening check-in · 21:00',
    value: 'On',
  },
  { id: 'units', icon: 'sliders', tone: 'accent', title: 'Units', value: 'Metric' },
  { id: 'language', icon: 'globe', tone: 'accent', title: 'Language', value: 'English' },
];

export const DATA_ROWS: readonly Row[] = [
  {
    id: 'export',
    icon: 'download',
    tone: 'accent',
    title: 'Data export',
    subtitle: 'All metrics and documents',
  },
  {
    id: 'upload',
    icon: 'file-text',
    title: 'Document upload',
    subtitle: 'Add a document — in the web version',
  },
];

export const SIGN_OUT: Row = {
  id: 'sign-out',
  icon: 'log-out',
  tone: 'danger',
  titleTone: 'danger',
  title: 'Sign out',
};

export const VERSION = '2Life · 0.4 core';

export type SettingsRow = Row;
