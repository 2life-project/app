/** Раздел «Добавки» — содержимое из макета. */
export const SUPPLEMENTS_SUMMARY = [
  { id: 'adherence', title: 'Adherence', subtitle: 'last 30 days', value: '96 %' },
  { id: 'missed', title: 'Missed', subtitle: 'one evening stack', value: '1' },
  { id: 'protocol', title: 'In a protocol', subtitle: 'lipids, vitamin D', value: '2' },
] as const;

export const COURSE_HINT = 'Tap a row to mark it taken. The arrow opens the course.';

export const ACTIVE_COURSE = {
  title: 'Vitamin D repletion',
  percent: '96%',
  value: 0.96,
  subtitle: 'day 26 of 30 · until Oct 5',
  note: '6 capsules left · shelf runs out in 3 days',
};

export const WHY_COURSES =
  'You sort your pills into a box once and take them as a stack. Marking the stack is one tap — and it is what the journal records.';
