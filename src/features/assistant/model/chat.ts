/** Тексты экрана ассистента. Сам диалог приходит с сервера. */
export const INTRO =
  'I read your metrics, records and protocols. Ask about any number — or ask me to move the day around.';

/** Подсказки: две строки по две, как в макете. */
export const SUGGESTIONS = [
  ['Why is recovery low?', 'Move my intervals'],
  ['Log a meal', 'What is left today?'],
] as const;

export const PLACEHOLDER = 'Ask about your labs…';

/** Подпись под списком веток: чем они отличаются друг от друга. */
export const THREADS_NOTE =
  'Each thread keeps its own context — the assistant reads only that one.';

export const DISCLAIMER = 'The assistant can make mistakes — verify important information.';

export const MEMO = {
  transcript: '“walked for forty minutes at an easy pace”',
  title: 'Walk · 40 minutes',
  meta: 'Activity · today 19:00–19:40 · 94% confidence',
  primary: 'Log it',
  secondary: 'Edit',
  note: 'the memo is saved and joins the day’s decisions',
  hint: 'hold to add another',
} as const;
