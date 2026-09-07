/** Раздел «Активность» — содержимое из макета. */
export const ACTIVITY_SUMMARY = [
  { id: 'workouts', title: 'Workouts', subtitle: 'powerlifting, intervals, walk', value: '3' },
  { id: 'steps', title: 'Steps', subtitle: 'of 10,000', value: '8,420' },
  { id: 'zones', title: 'Zone 2–3', subtitle: 'target 45', value: '62 min' },
] as const;

export const WORKOUTS = [
  {
    id: 'powerlifting',
    icon: 'activity',
    title: 'Powerlifting',
    subtitle: '45 min · 360 kcal',
    value: '8.4',
  },
  {
    id: 'intervals',
    icon: 'zap',
    title: 'Intervals · 5 × 3 min',
    subtitle: '18 min · 210 kcal',
    value: '4.1',
  },
  { id: 'walk', icon: 'navigation', title: 'Walk', subtitle: '40 min · 1.2 km', value: '1.7' },
] as const;

/** Тридцать дней нагрузки. Последний столбец — сегодня, он выделен. */
export const STRAIN_30_DAYS = [
  9.2, 12.4, 11.1, 8.6, 13.8, 10.2, 14.6, 9.8, 12.9, 7.4, 11.7, 15.2, 10.6, 8.2, 12.1, 13.4, 9.6,
  11.2, 10.8, 14.1, 12.6, 8.9, 13.2, 11.4, 16.8, 12.2, 13.6, 10.4, 12.8, 14.2,
] as const;

export const ABOUT_STRAIN =
  'Strain is a 0–21 score of how much load your body took today — from workouts, steps and heart-rate zones. It grows with intensity, not with time.';
