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

/** Сторонний трекер: что синхронизируется, чего не будет, и наш браслет. */
export const TRACKER = {
  name: 'Whoop 4.0',
  status: 'third-party tracker · synced 07:42',
  chip: 'WORKING',
  connection:
    'Data comes through your Whoop account: we read what their app has already computed and never talk to the band itself.',
  link: 'Open the Whoop app',
  syncs: [
    {
      id: 'sleep',
      icon: 'moon',
      title: 'Sleep and recovery',
      subtitle: 'stages, HRV, resting heart rate',
    },
    {
      id: 'workouts',
      icon: 'activity',
      title: 'Workouts',
      subtitle: 'type, duration, heart-rate zones',
    },
    { id: 'hr', icon: 'heart', title: 'Heart rate', subtitle: 'continuous, all day' },
    { id: 'spo2', icon: 'wind', title: 'SpO₂', subtitle: 'nightly readings' },
  ],
  missing: [
    {
      id: 'battery',
      title: 'Battery and firmware here',
      subtitle: 'the maker’s app owns the device',
    },
    {
      id: 'alarm',
      title: 'Silent alarm by vibration',
      subtitle: 'no access to another band’s motor',
    },
    { id: 'voice', title: 'Voice notes from the band', subtitle: 'no microphone in our loop' },
    { id: 'temp', title: 'Skin temperature', subtitle: 'Whoop does not expose it' },
  ],
  ours: {
    title: '2Life band',
    text: 'With our band, battery and firmware live here, the silent alarm works, and a voice note is one long press away.',
    action: 'Learn about the band',
  },
  disconnect: 'Disconnect Whoop',
} as const;

/**
 * Тексты экрана привязки. Этого экрана в макете нет — формулировки рабочие и
 * ждут вычитки: придуманный текст в интерфейсе живёт дольше, чем кажется.
 */
export const PAIRING = {
  title: 'Connect a band',
  subtitle: 'over Bluetooth',
  found: 'Nearby',
  start: 'Search',
  stop: 'Stop',
  searching: {
    title: 'Looking for your band',
    text: 'Keep it close and awake. Bands hide from search while another app holds them — close that app first.',
  },
  idle: {
    title: 'Nothing found yet',
    text: 'Start the search with the band next to the phone.',
  },
  off: {
    title: 'Bluetooth is off',
    text: 'Turn it on in the system settings — without the radio there is nothing to search with.',
  },
  errors: {
    permission:
      'Without permission to search the list stays empty — grant it in the system settings.',
    scan: 'The search stopped. Try again.',
    connect: 'The band did not answer. Bring it closer and try again.',
    // Список показывает всё, что рядом: признака нашего браслета в эфире мы
    // не знаем. Проверка после подключения — единственный способ не запомнить
    // телевизор как браслет.
    notBand: 'That device is not a band — it does not report a battery. Pick another one.',
  } as Record<string, string>,
  note: 'Only the band is remembered, on this phone. Measurements are not read yet — that needs the band protocol.',
} as const;

/**
 * Пока протокола браслета нет, приложение читает у него только то, что отдаёт
 * любое устройство BLE: заряд, модель, версию. Сказать об этом на экране
 * обязательно — иначе «подключено» читается как «измерения идут».
 */
export const NO_SYNC = {
  title: 'Measurements are not syncing yet',
  text: 'The band answers over Bluetooth and reports its charge and model. Steps, sleep and heart rate live in the vendor protocol — until we have it, those numbers come from elsewhere, not from this band.',
} as const;
