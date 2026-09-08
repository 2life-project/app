/** Протоколы и цели — содержимое из макета. */
export const PROTOCOLS_SECTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'finished', label: 'Finished' },
  { value: 'goals', label: 'Goals' },
] as const;

export type ProtocolsSection = (typeof PROTOCOLS_SECTIONS)[number]['value'];

export const ACTIVE_PROTOCOLS = [
  {
    id: 'lipid',
    title: 'Lipid correction',
    target: 'ApoB 1.24 → 0.90',
    percent: '94%',
    value: 0.94,
    tone: 'success',
    footer: 'day 26 of 30',
  },
  {
    id: 'vitd',
    title: 'Vitamin D repletion',
    target: '28 → 40–60 ng/mL',
    percent: '96%',
    value: 0.96,
    tone: 'success',
    footer: 'day 26 of 30',
  },
  {
    id: 'recovery',
    title: 'Recovery and sleep',
    target: 'sleep 7:42 → 8:00',
    percent: '71%',
    value: 0.71,
    tone: 'warning',
    footer: 'weak link · until Aug 20',
  },
  {
    id: 'omega',
    title: 'Omega-3 index',
    target: '6.1 → 8.0 %',
    percent: '100%',
    value: 0.13,
    tone: 'success',
    footer: 'day 12 of 90',
  },
  {
    id: 'zone2',
    title: 'Zone 2 base',
    target: '140 → 180 min a week',
    percent: '78%',
    value: 0.16,
    tone: 'warning',
    footer: 'day 9 of 56',
  },
] as const;

export const FINISHED_PROTOCOLS = [
  {
    id: 'iron',
    title: 'Iron repletion',
    target: 'ferritin 24 → 80 ng/mL',
    percent: '100%',
    value: 1,
    tone: 'success',
    footer: 'finished May 18',
  },
  {
    id: 'sleep-window',
    title: 'Sleep window',
    target: 'bedtime 01:10 → 23:30',
    percent: '100%',
    value: 1,
    tone: 'success',
    footer: 'finished Apr 2',
  },
] as const;

export const GOALS = [
  {
    id: 'apob',
    title: 'ApoB under 0.90',
    target: 'now 1.24 g/L',
    percent: '62%',
    value: 0.62,
    tone: 'warning',
    footer: 'driven by the lipid protocol',
  },
  {
    id: 'vo2',
    title: 'VO₂max above 50',
    target: 'now 48.2',
    percent: '88%',
    value: 0.88,
    tone: 'success',
    footer: 'driven by zone 2 base',
  },
  {
    id: 'fat',
    title: 'Body fat under 14 %',
    target: 'now 15.1 %',
    percent: '74%',
    value: 0.74,
    tone: 'success',
    footer: 'no protocol yet',
  },
] as const;

/** Что такое протокол — на экране, где его целей может не быть вовсе. */
export const PROTOCOL_NOTE =
  'A protocol is a set of rules and the goals they move. The goals below come from the server; the rules are not described in the contract yet.';

export const PROTOCOLS_VS_GOALS =
  'A goal is where you want a number to be. A protocol is the plan that moves it — and the only thing you actually do every day.';
