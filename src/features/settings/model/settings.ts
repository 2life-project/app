import type Feather from '@expo/vector-icons/Feather';

import { readingsNote, type BandReadings, type PairedBand } from '@/shared/domain';
import type { Tone } from '@/shared/theme';

type IconName = keyof typeof Feather.glyphMap;

/** Подпись подписки. Статус приходит в ключе доступа — отдельной ручки нет. */
export const PLAN_LABEL = '2LIFE+';

export type Row = {
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

/**
 * Собственный браслет в списке источников.
 *
 * Строка живая, а не из макета: у остальных подписи выдуманы, а здесь стоит
 * настоящее состояние — привязан ли, когда с него последний раз читали и на
 * связи ли он сейчас. Не привязан — строки нет вовсе: показывать источник,
 * которого у человека не существует, значит обещать чужие данные.
 */
export function bandRow(paired: PairedBand | null, readings: BandReadings | null): Row | null {
  if (!paired) return null;

  return {
    id: 'band',
    opens: 'device',
    icon: 'watch',
    tone: 'success',
    title: paired.name,
    subtitle: readingsNote(readings) ?? 'paired, nothing read yet',
    connected: readings?.live === true,
  };
}

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
    // Экран есть только у своего браслета. Чужой трекер подключается через
    // OAuth в вебе: сессии веб-приложения у телефона нет.
    options: [
      { id: 'band', title: '2Life band', subtitle: 'battery, sensors and voice notes live here' },
      { id: 'whoop', title: 'Whoop', subtitle: 'connect in the web app' },
      { id: 'oura', title: 'Oura', subtitle: 'connect in the web app' },
      { id: 'withings', title: 'Withings', subtitle: 'connect in the web app' },
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
