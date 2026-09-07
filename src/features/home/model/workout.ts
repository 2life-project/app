/** Тренировка из макета: разбор одной сессии. */
export const WORKOUT = {
  title: 'Powerlifting',
  when: 'Monday, July 13 · 17:05',
  strain: { value: 8.4, of: 21, caption: 'STRAIN · 59% of today’s load' },
  rows: [
    { title: 'Peak zone', subtitle: '16 min there', value: 'Zone 3' },
    { title: 'vs last session', subtitle: 'heavier than Monday', value: '+0.9' },
    { title: 'Recovery cost', subtitle: 'sleep 8 h to clear', value: 'moderate' },
  ],
  tiles: [
    { label: 'DURATION', value: '45', unit: 'min' },
    { label: 'CALORIES', value: '360', unit: 'kcal' },
    { label: 'AVG HR', value: '128', unit: 'bpm' },
    { label: 'MAX HR', value: '164', unit: 'bpm' },
  ],
  /** Доля берётся от самой длинной полосы, как в макете: это время в зоне. */
  zones: [
    { id: 'z5', label: 'Zone 5', minutes: 2 },
    { id: 'z4', label: 'Zone 4', minutes: 7 },
    { id: 'z3', label: 'Zone 3', minutes: 16 },
    { id: 'z2', label: 'Zone 2', minutes: 14 },
    { id: 'z1', label: 'Zone 1', minutes: 6 },
  ],
  curve: [96, 104, 118, 131, 126, 140, 152, 147, 158, 164, 149, 138, 129, 121, 112],
  duration: '45 min',
  source: 'Source: Whoop · auto-detected',
} as const;

/** Самая длинная зона задаёт масштаб: полоса показывает время, а не процент. */
export const ZONE_PEAK = Math.max(...WORKOUT.zones.map((zone) => zone.minutes));

/** Добавление тренировки вручную: типы и поля из макета. */
export const WORKOUT_TYPES = [
  { id: 'strength', icon: 'activity', label: 'Strength' },
  { id: 'run', icon: 'wind', label: 'Run' },
  { id: 'walk', icon: 'navigation', label: 'Walk' },
  { id: 'cycle', icon: 'disc', label: 'Cycle' },
  { id: 'swim', icon: 'droplet', label: 'Swim' },
  { id: 'yoga', icon: 'sun', label: 'Yoga' },
] as const;

export const WORKOUT_FIELDS = [
  { id: 'started', label: 'Started', hint: 'Today, 17:05' },
  { id: 'duration', label: 'Duration', hint: '45 min' },
  { id: 'effort', label: 'Effort', hint: '7 of 10 — hard' },
  { id: 'calories', label: 'Calories', hint: '360 kcal · estimated' },
] as const;

export const ESTIMATED_STRAIN = {
  title: 'Estimated strain',
  value: '6.2',
  of: 'of 21',
  text: 'From duration and effort — the band would have measured it from heart rate.',
};
