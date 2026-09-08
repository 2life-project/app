/** Вечерний чек-ин из макета: короткая форма и её вопросы. */
export const CHECK_IN_FORMS = [
  { value: 'short', label: 'Short · 3 questions' },
  { value: 'detailed', label: 'Detailed · 8' },
] as const;

export type CheckInForm = (typeof CHECK_IN_FORMS)[number]['value'];

export const NOTE = {
  title: 'A note about the day',
  hint: 'optional · you can also dictate it',
};

export const CLOSING_NOTE =
  'Closing without answering keeps the day empty — the check-in is never filled in for you.';
