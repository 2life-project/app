/**
 * Содержимое Обзора взято из макета дословно, включая язык: фрейм собран
 * по-английски. Это заглушечные данные — они уедут, когда появится источник.
 */
export const RINGS = [
  { id: 'recovery', value: 0.68, valueLabel: '68', label: 'RECOVERY', tone: 'warning' },
  { id: 'fuel', value: 0.77, valueLabel: '77', label: 'FUEL', tone: 'success' },
  { id: 'strain', value: 0.62, valueLabel: '14.2', label: 'STRAIN', tone: 'success' },
  { id: 'doses', value: 0.33, valueLabel: '1/3', label: 'DOSES', tone: 'warning' },
] as const;

/**
 * Приёмы дня. `time` — когда положено, `status` — что показать после отметки:
 * до отметки строка говорит «когда», после — «когда принял».
 */
export const SUPPLEMENT_STACKS = [
  {
    id: 'morning',
    title: 'Morning stack',
    subtitle: 'Omega-3, D3 2,000 IU, Mg',
    time: '08:00',
    status: 'taken 08:04',
    taken: true,
  },
  {
    id: 'day',
    title: 'Day stack',
    subtitle: 'Zinc, B-complex',
    time: '14:00',
    status: 'taken 14:12',
    taken: false,
  },
  {
    id: 'evening',
    title: 'Evening stack',
    subtitle: 'Magnesium glycinate',
    time: '21:00',
    status: 'taken 21:05',
    taken: false,
  },
] as const;

/** Четыре системы тела — один шаблон, разное содержимое. Данные из макета. */
export const BODY_SYSTEMS = [
  {
    id: 'recovery',
    icon: 'moon',
    title: 'Recovery',
    ring: { value: 0.68, valueLabel: '68', tone: 'warning' },
    tiles: [
      { label: 'SLEEP', value: '7:42', note: 'of 8:00' },
      { label: 'HRV', value: '48 ms', note: 'base 62' },
    ],
  },
  {
    id: 'heart',
    icon: 'heart',
    title: 'Heart',
    ring: { value: 0.88, valueLabel: '54', tone: 'success' },
    tiles: [
      { label: 'RESTING HR', value: '54 bpm' },
      { label: 'VO₂MAX', value: '48.2', note: '+0.6' },
    ],
  },
  {
    id: 'breathing',
    icon: 'wind',
    title: 'Breathing',
    ring: { value: 0.96, valueLabel: '96', tone: 'success' },
    tiles: [
      { label: 'SPO₂', value: '96 %', note: 'in range' },
      { label: 'RESP. RATE', value: '14.2', note: 'per min' },
    ],
  },
  {
    id: 'composition',
    icon: 'box',
    title: 'Body composition',
    ring: { value: 0.82, valueLabel: '82', tone: 'success' },
    tiles: [
      { label: 'WEIGHT', value: '82.1 kg', note: '−0.4' },
      { label: 'BODY FAT', value: '15.1 %', note: '−1.1' },
    ],
  },
] as const;

/** План дня. `next` — ближайшее событие, оно выделено и несёт метку. */
export const PLAN = [
  { id: 'weigh', time: '09:15', title: 'Weigh-in', subtitle: '82.1 kg logged', state: 'done' },
  {
    id: 'lunch',
    time: '12:40',
    title: 'Lunch',
    subtitle: '620 kcal · 41 g protein',
    state: 'done',
  },
  {
    id: 'visit',
    time: '15:30',
    title: 'Video visit · Anna Smirnova',
    subtitle: 'blood pressure follow-up',
    state: 'next',
    badge: 'NEXT',
  },
  {
    id: 'intervals',
    time: '18:30',
    title: 'Intervals · 5 × 3 min',
    subtitle: 'flagged by a decision',
    state: 'upcoming',
  },
] as const;

export const PROTOCOLS = [
  {
    id: 'lipid',
    title: 'Lipid correction',
    percent: '87%',
    value: 0.87,
    subtitle: 'day 26 of 30 · ApoB 1.24 → 0.90',
    tone: 'success',
  },
  {
    id: 'vitd',
    title: 'Vitamin D repletion',
    percent: '87%',
    value: 0.87,
    subtitle: 'day 26 of 30 · 28 → 40–60 ng/mL',
    tone: 'highlight',
  },
  {
    id: 'sleep',
    title: 'Recovery and sleep',
    percent: '71%',
    value: 0.71,
    subtitle: 'weak link · until Aug 20',
    tone: 'warning',
  },
] as const;

export const LIVE_STREAMS = [
  { label: 'HRV', value: '48', unit: 'ms' },
  { label: 'RESTING HR', value: '54', unit: 'bpm' },
  { label: 'GLUCOSE', value: '5.2', unit: 'mmol/L' },
  { label: 'SPO₂', value: '96', unit: '%' },
] as const;
