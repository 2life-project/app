/**
 * Содержимое диалога из макета. Это заглушка: настоящий диалог придёт с
 * сервера, а формулировки здесь — ровно те, что в эталоне.
 */
export const INTRO =
  'I read your metrics, records and protocols. Ask about any number — or ask me to move the day around.';

/** Подсказки: две строки по две, как в макете. */
export const SUGGESTIONS = [
  ['Why is recovery low?', 'Move my intervals'],
  ['Log a meal', 'What is left today?'],
] as const;

export const CONVERSATION = {
  question: 'Why is recovery low?',
  answer:
    'HRV 48 ms against a base of 62, resting HR 54 against 52, sleep 7.7 against 7.9 h. Two independent signals moved the same way — this is load, not noise. Forty minutes in zone 2 keeps the volume without the debt.',
  /** Ассистент называет источники: ответ без них — это мнение, а не вывод. */
  sources: 'From your data: HRV · Resting HR · Last night sleep',
} as const;

export const PLACEHOLDER = 'Ask about your labs…';

export const DISCLAIMER = 'The assistant can make mistakes — verify important information.';

/** Ответ ассистента на подсказку. Пока источник один — макет. */
export type Message = { id: string; from: 'you' | 'assistant'; text: string; sources?: string };

export const ANSWERS: Record<string, { text: string; sources?: string }> = {
  'Why is recovery low?': {
    text: CONVERSATION.answer,
    sources: CONVERSATION.sources,
  },
  'Move my intervals': {
    text: 'Moved to Thursday 18:30 — Wednesday already carries the long walk, and two hard days in a row is what pushed recovery down last week.',
    sources: 'From your data: The plan · Strain · Recovery',
  },
  'Log a meal': {
    text: 'Open the meal screen and I will fill in what I can from the photo — you correct the weight, and the numbers become yours.',
  },
  'What is left today?': {
    text: 'The evening stack at 21:00 and the check-in. The intervals are done, lunch is logged.',
    sources: 'From your data: The plan · Supplements',
  },
};

export const FALLBACK_ANSWER =
  'I read metrics, records and protocols — ask about a number and I will say what it rests on. Without the server behind me this is all I can answer for now.';

/** История тредов из макета: диалог живёт около пяти минут, дальше — новый. */
export const THREADS = [
  { id: 'recovery', title: 'Why is recovery low?', when: 'today, 13:38' },
  { id: 'intervals', title: 'Move my intervals', when: 'today, 13:31' },
  { id: 'visit', title: 'What to bring to the visit', when: 'July 12' },
  { id: 'panel', title: 'Biomarker panel review', when: 'June 18' },
  { id: 'headaches', title: 'Evening headaches', when: 'June 15' },
] as const;

export const THREADS_NOTE =
  'a thread’s context lives about 5 minutes — after that the assistant answers fresh from the data';

/** Голосовая заметка: что распознали и что с этим делать. */
export const MEMO = {
  transcript: '“walked for forty minutes at an easy pace”',
  title: 'Walk · 40 minutes',
  meta: 'Activity · today 19:00–19:40 · 94% confidence',
  primary: 'Log it',
  secondary: 'Edit',
  note: 'the memo is saved and joins the day’s decisions',
  hint: 'hold to add another',
} as const;
