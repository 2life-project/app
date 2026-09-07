/** Суб-навигация Главной — разделы ленты виджетов из макета. */
export const HOME_SECTIONS = [
  { value: 'overview', label: 'Overview' },
  { value: 'activity', label: 'Activity' },
  { value: 'nutrition', label: 'Nutrition' },
  { value: 'supplements', label: 'Supplements' },
  { value: 'wellbeing', label: 'Wellbeing' },
] as const;

export type HomeSection = (typeof HOME_SECTIONS)[number]['value'];
