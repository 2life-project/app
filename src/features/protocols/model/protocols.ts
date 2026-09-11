/** Вкладки раздела и его пояснения. Сами протоколы приходят с сервера. */
export const PROTOCOLS_SECTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'finished', label: 'Finished' },
  { value: 'goals', label: 'Goals' },
] as const;

export type ProtocolsSection = (typeof PROTOCOLS_SECTIONS)[number]['value'];

/** Что такое протокол — на экране, где его целей может не быть вовсе. */
export const PROTOCOL_NOTE =
  'A protocol is a set of rules and the goals they move. Progress by goal is counted by the server against the baseline it recorded.';

export const PROTOCOLS_VS_GOALS =
  'A goal is where you want a number to be. A protocol is the plan that moves it — and the only thing you actually do every day.';
