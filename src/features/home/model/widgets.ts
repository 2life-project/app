/**
 * Набор виджетов Главной. Порядок в списке — порядок в ленте: сервер хранит
 * ячейки списком, и перестановка здесь означает перестановку там.
 */
export const WIDGET_CHOICES = [
  { id: 'vitals', title: 'Four rings', subtitle: 'recovery, fuel, strain, doses', on: true },
  { id: 'now', title: 'Next up', subtitle: 'the next event of the day', on: true },
  { id: 'meds', title: 'Supplements', subtitle: 'today’s doses and the streak', on: true },
  { id: 'rails', title: 'The plan', subtitle: 'what is planned for today', on: true },
  { id: 'recover', title: 'Recovery', subtitle: 'sleep and readiness', on: true },
  { id: 'heart', title: 'Heart', subtitle: 'pulse, variability, pressure', on: true },
  { id: 'breathing', title: 'Breathing', subtitle: 'saturation and rate', on: false },
  { id: 'composition', title: 'Body composition', subtitle: 'weight and composition', on: true },
  { id: 'goals', title: 'Protocols and goals', subtitle: 'progress by goal', on: true },
  { id: 'streams', title: 'Live streams', subtitle: 'live values from the band', on: false },
] as const;

export const WIDGETS_NOTE =
  'The order here is the order on Home. Turning a widget off hides it — the data behind it stays.';
