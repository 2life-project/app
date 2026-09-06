import type { Tone } from '@/shared/theme';

/** Экран браслета: состав и формулировки из макета. */
export const BAND = {
  name: '2Life band',
  status: 'connected · synced 2 min',
  chip: 'CONNECTED',
  battery: 78,
  rows: [
    { id: 'lasts', title: 'Lasts', subtitle: 'at the current usage', value: '≈ 3 days' },
    { id: 'worn', title: 'Worn since', subtitle: '9 h 20 min today', value: '07:12' },
    { id: 'case', title: 'Charging case', subtitle: '≈ 2 full charges', value: '62 %' },
  ],
} as const;

type Sensor = {
  id: string;
  icon: 'heart' | 'activity' | 'thermometer' | 'move' | 'mic';
  tone: Tone;
  title: string;
  subtitle: string;
};

export const SENSORS: readonly Sensor[] = [
  {
    id: 'hr',
    icon: 'heart',
    tone: 'danger',
    title: 'Heart rate and HRV',
    subtitle: 'recording continuously',
  },
  {
    id: 'spo2',
    icon: 'activity',
    tone: 'accent',
    title: 'SpO₂',
    subtitle: 'at night, every 5 minutes',
  },
  {
    id: 'temp',
    icon: 'thermometer',
    tone: 'warning',
    title: 'Skin temperature',
    subtitle: 'baseline over 14 nights',
  },
  {
    id: 'accel',
    icon: 'move',
    tone: 'success',
    title: 'Accelerometer',
    subtitle: 'steps, sleep, workouts',
  },
  { id: 'mic', icon: 'mic', tone: 'neutral', title: 'Microphone', subtitle: 'voice notes' },
];

export const MICROPHONE_NOTE =
  'The microphone records by request only — hold the button on the band and speak.';

type SettingRow = { id: string; title: string; subtitle: string; on: boolean };

export const HAPTICS: readonly SettingRow[] = [
  { id: 'alarm', title: 'Silent alarm', subtitle: 'buzzes in light sleep', on: true },
  { id: 'courses', title: 'Course reminders', subtitle: 'morning, day, evening', on: true },
  { id: 'calls', title: 'Calls and messages', subtitle: 'buzz on phone events', on: false },
  { id: 'nudges', title: 'Recovery nudges', subtitle: 'when your base drifts down', on: true },
];

export const SYNC = {
  last: { title: 'Last sync', subtitle: '2 minutes ago' },
  firmware: { title: 'Firmware', subtitle: '1.4.2 · 1.5.0 available', action: 'Update' },
  background: {
    id: 'background',
    title: 'Background sync',
    subtitle: 'every 15 minutes when in range',
    on: true,
  },
} as const;

export const CARE = {
  title: 'How to care for it',
  text: 'Charge it every 4–5 days, rinse it after a workout and take it off for the shower. The strap comes off without tools.',
  link: 'All instructions',
} as const;

export const UNPAIR = 'Unpair the band';
