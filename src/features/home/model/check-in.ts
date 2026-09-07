/** Вечерний чек-ин из макета: короткая форма и её вопросы. */
export const CHECK_IN_FORMS = [
  { value: 'short', label: 'Short · 3 questions' },
  { value: 'detailed', label: 'Detailed · 8' },
] as const;

export type CheckInForm = (typeof CHECK_IN_FORMS)[number]['value'];

export const QUESTIONS = [
  {
    key: 'day',
    title: 'The day overall',
    hint: '1 poor · 10 excellent',
    minimum: 1,
    maximum: 10,
    initial: 8,
  },
  {
    key: 'energy',
    title: 'Energy',
    hint: 'how much you had to spend',
    minimum: 1,
    maximum: 10,
    initial: 6,
  },
  {
    key: 'sleep',
    title: 'Sleep quality',
    hint: 'how it felt, not how long',
    minimum: 1,
    maximum: 10,
    initial: 5,
  },
] as const;

export const NOTE = {
  title: 'A note about the day',
  hint: 'optional · you can also dictate it',
};

export const CLOSING_NOTE =
  'Closing without answering keeps the day empty — the check-in is never filled in for you.';
