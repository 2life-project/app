/** Курс добавок из макета: приём, состав, приверженность, связь с протоколом. */
export const COURSE = {
  title: 'Morning stack',
  when: '3 capsules · every day at 08:00',
  taken: 'Taken today at 08:04',
  streak: '29-DAY STREAK',
  items: [
    {
      id: 'omega',
      title: 'Omega-3',
      dose: '2 g EPA+DHA',
      goal: 'omega-3 index 6.1 → 8.0',
      left: '18 days left',
    },
    {
      id: 'd3',
      title: 'Vitamin D3',
      dose: '2,000 IU',
      goal: '28 → 40–60 ng/mL',
      left: '6 days left',
    },
    {
      id: 'mg',
      title: 'Magnesium glycinate',
      dose: '400 mg',
      goal: 'sleep and recovery',
      left: '24 days left',
    },
  ],
  adherence: {
    title: 'Last 30 days',
    caption: '1 missed',
    days: [
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    ],
  },
  protocols: ['Lipid correction', 'Vitamin D repletion'],
  about: {
    title: 'Why a stack, not pills',
    text: 'You sorted these into the box once. Marking the stack is one tap — and it is what the journal records.',
  },
} as const;

export const NEW_COURSE_FIELDS = [
  { id: 'name', label: 'Course name', hint: 'Morning stack' },
  { id: 'time', label: 'When', hint: 'every day · 08:00' },
  { id: 'items', label: 'What is in it', hint: 'Omega-3 2 g, D3 2,000 IU' },
  { id: 'supply', label: 'How much you have', hint: '60 capsules' },
] as const;
