/** Раздел «Самочувствие» — содержимое из макета. */
export const WELLBEING_SUMMARY = [
  { id: 'checkin', title: 'Check-in', subtitle: '13:20 · 3 questions', value: 'done' },
  { id: 'streak', title: 'Streak', subtitle: 'evenings in a row', value: '29' },
  { id: 'trend', title: '7-day trend', subtitle: 'above base 7.2', value: '+0.6' },
] as const;

export const WELLBEING_PARTS = [
  { label: 'MOOD', value: '8', note: 'of 10 · above base', noteTone: 'success' },
  { label: 'ENERGY', value: '62', note: 'of 100 · in range', noteTone: 'success' },
  { label: 'SLEEP', value: '7.4', note: 'of 10 · below base', noteTone: 'warning' },
  { label: 'STRESS', value: '3', note: 'of 10 · low', noteTone: 'success' },
] as const;

export const DAY_SCORE_7_DAYS = [7.1, 6.8, 7.9, 7.4, 7.2, 8.1, 8.4] as const;

export const WHAT_IT_MEANS =
  'The score sits above your base 7.2. Sleep drags it down — 7.4 against your usual 8.2. On training days mood runs 1.3 points higher.';
