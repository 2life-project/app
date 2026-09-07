/** Протокол детально из макета: приверженность, цели, день, динамика. */
export const PROTOCOL = {
  title: 'Lipid correction',
  subtitle: 'started Aug 29 · until Sep 28',
  adherence: { percent: 0.94, label: '94%', day: 'day 26/30', caption: 'ADHERENCE · 4 days left' },
  rows: [
    { title: 'ApoB', subtitle: '1.42 → goal 0.90', value: '1.24' },
    { title: 'LDL', subtitle: '4.10 → goal 2.60', value: '3.64' },
    { title: 'Missed days', subtitle: 'both evening stacks', value: '2' },
  ],
  targets: [
    {
      id: 'apob',
      title: 'ApoB',
      value: '1.24 g/L',
      progress: 0.34,
      start: 'start 1.42',
      goal: 'goal 0.90',
    },
    {
      id: 'ldl',
      title: 'LDL',
      value: '3.64 g/L',
      progress: 0.3,
      start: 'start 4.10',
      goal: 'goal 2.60',
    },
  ],
  today: {
    caption: '2 of 3 done',
    tasks: [
      { id: 'omega', title: 'Omega-3 · 2 g', subtitle: 'with lunch · taken 12:40', done: true },
      { id: 'zone2', title: 'Zone 2 · 40 min', subtitle: 'walk logged at 19:05', done: true },
      {
        id: 'evening',
        title: 'Evening stack',
        subtitle: 'magnesium glycinate · 21:00',
        done: false,
      },
    ],
  },
  since: {
    title: 'ApoB since start',
    caption: '1.42 → 1.24',
    values: [1.42, 1.4, 1.39, 1.37, 1.36, 1.33, 1.31, 1.3, 1.28, 1.27, 1.26, 1.25, 1.24, 1.24],
  },
  adherence30: {
    title: 'Adherence · 26 days',
    caption: '2 missed',
    days: [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  },
  about: {
    title: 'How adherence is counted',
    text: 'Every item you tick counts once for its day. A missed evening stack lowers the day, not the whole protocol — the streak survives one slip.',
  },
} as const;
