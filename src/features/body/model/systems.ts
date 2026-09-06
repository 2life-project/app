/**
 * Четыре системы тела по единому шаблону. Содержимое из макета: у каждой своё
 * кольцо, сводка, живые показатели и два графика.
 */
export const BODY_SECTIONS = [
  { value: 'heart', label: 'Heart and vessels' },
  { value: 'breathing', label: 'Breathing' },
  { value: 'recovery', label: 'Recovery' },
  { value: 'composition', label: 'Body composition' },
] as const;

export type BodySection = (typeof BODY_SECTIONS)[number]['value'];

const RESTING_HR = [
  58, 61, 59, 63, 57, 62, 60, 64, 58, 61, 66, 59, 62, 57, 63, 68, 60, 59, 64, 61, 58, 65, 62, 60,
  63, 59, 61, 57, 60, 62,
] as const;

const HRV_TREND = [
  68, 62, 66, 58, 64, 56, 61, 54, 59, 52, 57, 50, 55, 48, 53, 47, 51, 46, 49, 48,
] as const;

export const BODY_SYSTEM = {
  heart: {
    title: 'Heart',
    caption: { label: 'VO₂MAX · ', accent: '+0.6 in 28 days' },
    ring: { value: 0.8, valueLabel: '48.2', note: 'good base', tone: 'success' },
    rows: [
      { id: 'fitness', title: 'Cardio fitness', subtitle: 'above your age base', value: '48.2' },
      { id: 'pressure', title: 'Blood pressure', subtitle: 'stable, 7-day mean', value: '118/74' },
      { id: 'rhythm', title: 'Rhythm', subtitle: 'nothing flagged', value: 'no events' },
    ],
    today: {
      title: 'Heart today',
      note: 'live',
      tiles: [
        { label: 'NOW', value: '62', note: 'bpm' },
        { label: 'AVG TODAY', value: '68', note: 'bpm' },
        { label: 'RANGE', value: '52–128', note: 'bpm' },
      ],
    },
    bars: { title: 'Resting HR · 30 days', note: 'base 58', values: RESTING_HR },
    line: { title: 'HRV · 30 days', note: '48 ms · base 62', values: HRV_TREND, tone: 'warning' },
    about:
      'Resting HR sits 4 bpm above your 30-day base and HRV keeps sliding. Two late sessions and short sleep are the usual drivers — the recovery protocol already tracks it.',
  },
  breathing: {
    title: 'Breathing',
    caption: { label: 'SPO₂ · ', accent: 'in range 28 days' },
    ring: { value: 0.96, valueLabel: '96 %', note: 'in range', tone: 'success' },
    rows: [
      { id: 'spo2', title: 'Oxygen saturation', subtitle: 'nightly minimum 93 %', value: '96 %' },
      { id: 'rate', title: 'Respiratory rate', subtitle: 'steady, 7-day mean', value: '14.2' },
      { id: 'snore', title: 'Snoring', subtitle: 'nothing flagged', value: 'no events' },
    ],
    today: {
      title: 'Breathing today',
      note: 'live',
      tiles: [
        { label: 'NOW', value: '96', note: '%' },
        { label: 'AVG TODAY', value: '96', note: '%' },
        { label: 'RANGE', value: '93–98', note: '%' },
      ],
    },
    bars: { title: 'Resp. rate · 30 days', note: 'base 14.0', values: RESTING_HR },
    line: { title: 'SpO₂ · 30 days', note: '96 % · base 96', values: HRV_TREND, tone: 'success' },
    about:
      'Saturation holds in range and respiratory rate is steady. Nights after late training run half a breath higher — that is expected, not a flag.',
  },
  recovery: {
    title: 'Recovery',
    caption: { label: 'READINESS · ', accent: 'below base 4 days' },
    ring: { value: 0.68, valueLabel: '68', note: 'below base', tone: 'warning' },
    rows: [
      { id: 'sleep', title: 'Sleep', subtitle: 'of your 8:00 target', value: '7:42' },
      { id: 'hrv', title: 'HRV', subtitle: 'base 62 ms', value: '48 ms' },
      { id: 'debt', title: 'Sleep debt', subtitle: 'over the last week', value: '2:10' },
    ],
    today: {
      title: 'Last night',
      note: 'from your band',
      tiles: [
        { label: 'DEEP', value: '1:12', note: 'of 1:30' },
        { label: 'REM', value: '1:38', note: 'of 1:45' },
        { label: 'AWAKE', value: '0:24', note: 'times 3' },
      ],
    },
    bars: { title: 'Sleep · 30 days', note: 'base 7:55', values: RESTING_HR },
    line: {
      title: 'Readiness · 30 days',
      note: '68 · base 76',
      values: HRV_TREND,
      tone: 'warning',
    },
    about:
      'Readiness follows sleep and HRV. Both sit under your base after two late sessions — the recovery protocol is what moves them back.',
  },
  composition: {
    title: 'Body composition',
    caption: { label: 'WEIGHT · ', accent: '−0.4 kg in 28 days' },
    ring: { value: 0.82, valueLabel: '82.1', note: 'kg', tone: 'success' },
    rows: [
      { id: 'weight', title: 'Weight', subtitle: 'seven-day mean', value: '82.1 kg' },
      { id: 'fat', title: 'Body fat', subtitle: 'down 1.1 in 28 days', value: '15.1 %' },
      { id: 'muscle', title: 'Muscle mass', subtitle: 'holding', value: '38.4 kg' },
    ],
    today: {
      title: 'Latest measurement',
      note: 'this morning',
      tiles: [
        { label: 'WEIGHT', value: '82.1', note: 'kg' },
        { label: 'BODY FAT', value: '15.1', note: '%' },
        { label: 'WAIST', value: '84', note: 'cm' },
      ],
    },
    bars: { title: 'Weight · 30 days', note: 'base 82.5', values: RESTING_HR },
    line: {
      title: 'Body fat · 30 days',
      note: '15.1 % · base 16.2',
      values: HRV_TREND,
      tone: 'success',
    },
    about:
      'Weight moves down slowly while muscle holds — that is the shape you want. A single morning reading means little; the seven-day mean is what the protocol reads.',
  },
} as const;

/**
 * Что показывать в кольце системы. Кольцо показывает один показатель — тот,
 * по которому человек ведёт эту систему; остальные остаются в сводке ниже.
 */
export const RING_OPTIONS: Record<
  BodySection,
  readonly { id: string; title: string; subtitle: string }[]
> = {
  heart: [
    { id: 'vo2max', title: 'VO₂max', subtitle: '48.2 · updated today' },
    { id: 'rhr', title: 'Resting heart rate', subtitle: '54 bpm · base 58' },
    { id: 'hrv', title: 'HRV', subtitle: '48 ms · base 62' },
    { id: 'bp', title: 'Blood pressure', subtitle: '118/74 · manual' },
    { id: 'zones', title: 'Heart-rate zones', subtitle: '62 min in zone 2' },
  ],
  breathing: [
    { id: 'spo2', title: 'SpO₂', subtitle: '96 % · in range' },
    { id: 'rate', title: 'Respiratory rate', subtitle: '14.2 per min' },
  ],
  recovery: [
    { id: 'recovery', title: 'Recovery', subtitle: '68 · below base' },
    { id: 'sleep', title: 'Sleep duration', subtitle: '7:42 of 8:00' },
    { id: 'hrv', title: 'HRV', subtitle: '48 ms · base 62' },
  ],
  composition: [
    { id: 'weight', title: 'Weight', subtitle: '82.1 kg · −0.4' },
    { id: 'fat', title: 'Body fat', subtitle: '15.1 % · −1.1' },
    { id: 'muscle', title: 'Muscle mass', subtitle: '66.4 kg' },
  ],
};

export const RING_NOTE =
  'The ring shows one metric — the one you steer this system by. The rest stay in the summary below.';
