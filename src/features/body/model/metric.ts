/** Экран «все графики» системы: период и графики показателей из макета. */
export const METRIC_RANGES = [
  { value: '7d', label: '7 days' },
  { value: '28d', label: '28 days' },
  { value: '3m', label: '3 months' },
] as const;

export type MetricRange = (typeof METRIC_RANGES)[number]['value'];

export const METRIC_CHARTS = [
  {
    id: 'rhr',
    title: 'Resting heart rate',
    caption: '54 bpm · base 58',
    values: [58, 57, 59, 56, 55, 57, 54, 55, 53, 54, 56, 55, 54, 54],
  },
  {
    id: 'hrv',
    title: 'HRV',
    caption: '48 ms · base 62',
    values: [62, 64, 60, 58, 61, 57, 55, 59, 52, 54, 51, 49, 50, 48],
  },
  {
    id: 'vo2max',
    title: 'VO₂max',
    caption: '48.2 · +0.6 in 28 days',
    values: [47.6, 47.6, 47.8, 47.7, 47.9, 48, 47.9, 48.1, 48, 48.2, 48.1, 48.2, 48.2, 48.2],
  },
  {
    id: 'bp',
    title: 'Blood pressure',
    caption: '118/74 · manual entries',
    values: [122, 120, 119, 121, 118, 117, 119, 118, 116, 118, 117, 118, 118, 118],
  },
  {
    id: 'zones',
    title: 'Time in HR zones 2–3',
    caption: '62 min today · target 45',
    values: [38, 44, 51, 40, 62, 47, 55, 49, 58, 44, 61, 52, 57, 62],
  },
] as const;
