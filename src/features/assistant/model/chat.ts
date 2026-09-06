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
