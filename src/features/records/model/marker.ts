/** Показатель биохимии из макета: значение, цель, динамика, измерения. */
export const MARKER = {
  title: 'ApoB',
  subtitle: 'apolipoprotein B · Jul 2, 2026',
  value: '1.24',
  unit: 'g/L',
  status: 'ABOVE YOUR TARGET',
  /** Шкала: доли из макета, метка — положение текущего значения на ней. */
  scale: {
    low: 0.42,
    mid: 0.23,
    high: 0.35,
    at: 0.62,
    from: '0.60',
    goal: 'your goal 0.90',
    to: '1.60',
  },
  target: {
    title: 'Your target is stricter than the lab’s',
    reference: { label: 'LAB REFERENCE', value: '< 1.00', note: 'g/L' },
    goal: { label: 'YOUR GOAL', value: '< 0.90', note: 'APOE ε3/ε4' },
    text: 'Your genetics raise cardiovascular risk at the same number, so the goal is set below the lab range.',
  },
  dynamics: {
    title: '14 measurements',
    caption: '−14% since Nov',
    values: [1.44, 1.42, 1.4, 1.38, 1.39, 1.36, 1.34, 1.35, 1.31, 1.3, 1.28, 1.27, 1.26, 1.24],
  },
  measurements: [
    { id: 'jul', date: 'Jul 2, 2026', source: 'Invitro · recognized', value: '1.24 g/L' },
    { id: 'may', date: 'May 18, 2026', source: 'Invitro · recognized', value: '1.31 g/L' },
    { id: 'mar', date: 'Mar 4, 2026', source: 'manual entry', value: '1.40 g/L' },
  ],
  linked: [
    { id: 'lipid', to: 'protocol', label: 'Protocol · Lipid correction' },
    { id: 'apob', to: 'goal', label: 'Goal · Bring ApoB down' },
  ],
  about: {
    title: 'About ApoB',
    text: 'ApoB counts the particles that carry cholesterol into the artery wall. One particle is one chance, so the count matters more than the cargo.',
  },
} as const;
